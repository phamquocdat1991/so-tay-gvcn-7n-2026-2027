import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createAccessService } from '../server/access-service.mjs';
import { makeHandler } from '../server/access-http.mjs';
import { AccessError, digest, managedUid, ipBucket, nextLimit, readRoster } from '../server/access-model.mjs';

const APP = 'test-class', CLASS = '7n', BASE = `artifacts/${APP}`;
const STATE = `${BASE}/classes/${CLASS}/state/main`;
const SECRET = 'test-only-secret-not-a-production-credential';
const clone = value => value === undefined ? undefined : structuredClone(value);
class Store {
  data = new Map(); sequence = 0; queue = Promise.resolve();
  collection(path) { return new Collection(this, path); }
  snapshot(ref) {
    if (ref instanceof Collection) {
      const docs = [...this.data.keys()].filter(p => p.startsWith(ref.path + '/') && p.split('/').length === ref.path.split('/').length + 1)
        .map(p => this.snapshot(new Document(this, p))).filter(s => !ref.filter || s.data()?.[ref.filter[0]] === ref.filter[1]);
      return { docs };
    }
    const value = clone(this.data.get(ref.path));
    return { id: ref.id, exists: value !== undefined, data: () => clone(value) };
  }
  runTransaction(fn) {
    const run = this.queue.then(async () => {
      const writes = [];
      const tx = { get: async ref => this.snapshot(ref), set: (ref, data) => writes.push(['set', ref.path, clone(data)]),
        update: (ref, data) => writes.push(['update', ref.path, clone(data)]), delete: ref => writes.push(['delete', ref.path]) };
      const result = await fn(tx);
      for (const [op, path, value] of writes) {
        if (op === 'delete') this.data.delete(path);
        else this.data.set(path, op === 'update' ? { ...this.data.get(path), ...value } : value);
      }
      return result;
    });
    this.queue = run.catch(() => {}); return run;
  }
}
class Collection {
  constructor(store, path, filter) { Object.assign(this, { store, path, filter }); }
  doc(id = `auto-${++this.store.sequence}`) { return new Document(this.store, `${this.path}/${id}`); }
  where(field, op, value) { assert.equal(op, '=='); return new Collection(this.store, this.path, [field, value]); }
  async get() { return this.store.snapshot(this); }
}
class Document {
  constructor(store, path) { Object.assign(this, { store, path, id: path.split('/').at(-1) }); }
  collection(name) { return new Collection(this.store, `${this.path}/${name}`); }
  async get() { return this.store.snapshot(this); }
}
function fixture() {
  const db = new Store();
  db.data.set(STATE, { state: {
    students: [{ id: 1, name: 'Student One', code: '12345', group: 'Group 1', password: 'legacy-secret' }, { id: 2, name: 'Student Two', code: '23456', group: 'Group 2' }],
    officerRoles: [{ status: 'active', assignedStudentId: '1', title: 'Class leader' }],
    academicScoresRecords: [{ studentId: 1, score: 8 }, { studentId: 2, score: 9 }],
    attendanceRecords: { '2026-09-01': { 1: 'present', 2: 'absent' } },
  } });
  db.data.set(`${BASE}/members/teacher`, { active: true, role: 'gvcn' });
  const issued = [];
  const auth = { async verifyIdToken(token) { if (token !== 'teacher-token') throw new Error('bad token'); return { uid: 'teacher' }; },
    async createCustomToken(uid, claims) { issued.push({ uid, claims }); return `test-token-${issued.length}`; } };
  let now = 1000000;
  const service = createAccessService({ db, auth, secret: SECRET, appId: APP, classId: CLASS, clock: () => now });
  return { db, auth, issued, service, advance: ms => { now += ms; } };
}
const uid = (kind, id) => managedUid(APP, CLASS, kind, id);
const login = (s, credential = '12345', kind = 'phhs', ip = '192.0.2.1') => s.login({ kind, credential }, ip);

test('sync preserves all five-digit codes and projects only the correct personal records', async () => {
  const { db, service } = fixture();
  await service.sync('teacher');
  assert.deepEqual(db.data.get(STATE).state.students.map(s => s.code), ['12345', '23456']);
  const view = db.data.get(`${BASE}/classes/${CLASS}/studentViews/1`).state;
  assert.deepEqual(view.students.map(s => s.id), [1]); assert.equal(view.students[0].password, undefined);
  assert.deepEqual(view.academicScoresRecords.map(r => r.studentId), [1]);
  assert.deepEqual(Object.keys(view.attendanceRecords['2026-09-01']), ['1']);
  const rawAccounts = [...db.data].filter(([path]) => /_accessAccounts|_accessLookups/.test(path));
  assert(!JSON.stringify(rawAccounts).includes('12345'));
});
test('valid code yields only a phhs custom token with version and correct identity', async () => {
  const f = fixture(); await f.service.sync('teacher'); await login(f.service);
  assert.deepEqual(f.issued[0], { uid: uid('phhs', 1), claims: { accessVersion: 1 } });
  const member = f.db.data.get(`${BASE}/members/${uid('phhs', 1)}`);
  assert.equal(member.role, 'phhs'); assert.equal(member.studentId, '1');
});
test('wrong code and unknown code disclose the same failure, no token issued', async () => {
  const f = fixture(); await f.service.sync('teacher');
  await assert.rejects(login(f.service, '99999'), e => e.status === 401 && !e.message.includes('Student'));
  assert.equal(f.issued.length, 0);
});
test('five-digit format is strict and cannot select another role or project', async () => {
  const f = fixture(); await f.service.sync('teacher');
  for (const code of ['1234', '123456', '12a45', ' 12345', 12345]) await assert.rejects(login(f.service, code), e => e.status === 400);
  await assert.rejects(login(f.service, '12345', 'gvcn'), e => e.status === 400);
  assert.equal(f.issued.length, 0);
});
test('password is unique per officer, never stored in plaintext, and cannot grant gvcn', async () => {
  const f = fixture(); await f.service.sync('teacher');
  const { password } = await f.service.mutate('teacher', { action: 'password', kind: 'bcs', studentId: '1' });
  assert.equal(password.length, 16);
  assert(!JSON.stringify([...f.db.data]).includes(password));
  await login(f.service, password, 'bcs');
  assert.equal(f.issued[0].uid, uid('bcs', 1));
  assert.equal(f.db.data.get(`${BASE}/members/${uid('bcs', 1)}`).role, 'bcs');
  await assert.rejects(login(f.service, password, 'phhs'), e => e.status === 400);
  await assert.rejects(f.service.mutate('teacher', { action: 'password', kind: 'bcs', studentId: '2' }), e => e.status === 409);
});
test('password reset removes old lookup and advances session version', async () => {
  const f = fixture(); await f.service.sync('teacher');
  const first = await f.service.mutate('teacher', { action: 'password', kind: 'bcs', studentId: '1' });
  const second = await f.service.mutate('teacher', { action: 'password', kind: 'bcs', studentId: '1' });
  assert.notEqual(first.password, second.password);
  await assert.rejects(login(f.service, first.password, 'bcs'), e => e.status === 401);
  await login(f.service, second.password, 'bcs');
  assert.equal(f.issued.at(-1).claims.accessVersion, 2);
});

test('teacher-chosen six-character password logs into the correct officer without plaintext storage or response echo', async () => {
  const f = fixture(); await f.service.sync('teacher');
  const beforeState = clone(f.db.data.get(STATE));
  const password = 'Test7N';
  const result = await f.service.mutate('teacher', { action: 'password', kind: 'bcs', studentId: '1', password });
  assert.deepEqual(result, { passwordSet: true });
  assert(!JSON.stringify([...f.db.data]).includes(password));
  assert.deepEqual(f.db.data.get(STATE), beforeState);
  await login(f.service, password, 'bcs');
  assert.equal(f.issued.at(-1).uid, uid('bcs', 1));
  assert.equal(f.db.data.get(`${BASE}/members/${uid('bcs', 1)}`).role, 'bcs');
  const list = await f.service.list('teacher');
  assert.equal(list.features.customOfficerPasswords, true);
  assert(!JSON.stringify(list).includes(password));
});

test('custom password replacement revokes the old generated password and advances the access version', async () => {
  const f = fixture();
  const old = await f.service.mutate('teacher', { action: 'password', kind: 'bcs', studentId: '1' });
  await login(f.service, old.password, 'bcs');
  await f.service.mutate('teacher', { action: 'password', kind: 'bcs', studentId: '1', password: 'New7N!' });
  await assert.rejects(login(f.service, old.password, 'bcs'), e => e.status === 401);
  await login(f.service, 'New7N!', 'bcs');
  assert.equal(f.issued.at(-1).claims.accessVersion, 2);
  assert.equal(f.db.data.get(`${BASE}/members/${uid('bcs', 1)}`).accessVersion, 2);
});

test('invalid explicit passwords never generate a random password or change saved state', async () => {
  for (const password of ['', '12345', 'x'.repeat(129), null, 123456, {}, ['secret'], ' secret', 'secret ', 'sec\nret', 'sec\tret', 'sec\0ret']) {
    const f = fixture(); const before = clone([...f.db.data]);
    await assert.rejects(f.service.mutate('teacher', { action: 'password', kind: 'bcs', studentId: '1', password }), e => e.status === 400);
    assert.deepEqual([...f.db.data], before);
  }
});

test('custom passwords preserve case, Unicode and internal spaces and accept the 128-character boundary', async () => {
  for (const password of ['Mây 7N@!', 'A'.repeat(128)]) {
    const f = fixture();
    await f.service.mutate('teacher', { action: 'password', kind: 'bcs', studentId: '1', password });
    await login(f.service, password, 'bcs');
    await assert.rejects(login(f.service, password.toLowerCase(), 'bcs'), e => e.status === 401);
  }
});

test('duplicate custom passwords across officers are rejected atomically without leaking the other identity', async () => {
  const f = fixture();
  f.db.data.get(STATE).state.officerRoles.push({ status: 'active', assignedStudentId: '2', title: 'Monitor' });
  await f.service.mutate('teacher', { action: 'password', kind: 'bcs', studentId: '1', password: 'Unique7N' });
  const before = clone([...f.db.data]);
  await assert.rejects(f.service.mutate('teacher', { action: 'password', kind: 'bcs', studentId: '2', password: 'Unique7N' }),
    e => e.status === 409 && !e.message.includes('Student One') && !e.message.includes('Unique7N'));
  assert.deepEqual([...f.db.data], before);
  await login(f.service, 'Unique7N', 'bcs');
  assert.equal(f.issued.at(-1).uid, uid('bcs', 1));
});

test('concurrent attempts to assign the same password have only one owner', async () => {
  const f = fixture();
  f.db.data.get(STATE).state.officerRoles.push({ status: 'active', assignedStudentId: '2', title: 'Monitor' });
  const results = await Promise.allSettled(['1', '2'].map(studentId => f.service.mutate('teacher', {
    action: 'password', kind: 'bcs', studentId, password: 'Concurrent7N',
  })));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.status, 409);
});

test('reusing the current password does not silently change the session version', async () => {
  const f = fixture();
  await f.service.mutate('teacher', { action: 'password', kind: 'bcs', studentId: '1', password: 'Repeat7N' });
  const before = clone([...f.db.data]);
  await assert.rejects(f.service.mutate('teacher', { action: 'password', kind: 'bcs', studentId: '1', password: 'Repeat7N' }), e => e.status === 409);
  assert.deepEqual([...f.db.data], before);
});

test('custom password cannot provision an unassigned officer or use the HS/PH role', async () => {
  const f = fixture(); const before = clone([...f.db.data]);
  await assert.rejects(f.service.mutate('teacher', { action: 'password', kind: 'bcs', studentId: '2', password: 'Test7N' }), e => e.status === 409);
  await assert.rejects(f.service.mutate('teacher', { action: 'password', kind: 'phhs', studentId: '1', password: 'Test7N' }), e => e.status === 400);
  assert.deepEqual([...f.db.data], before);
});

test('custom-password officer remains blocked after a roster sync and cannot avoid attempt limits', async () => {
  const f = fixture();
  await f.service.mutate('teacher', { action: 'password', kind: 'bcs', studentId: '1', password: 'Test7N' });
  await f.service.mutate('teacher', { action: 'toggle', kind: 'bcs', studentId: '1', active: false });
  await f.service.sync('teacher');
  for (let i = 0; i < 30; i++) await assert.rejects(login(f.service, 'Test7N', 'bcs'), e => e.status === 401);
  await assert.rejects(login(f.service, 'Test7N', 'bcs'), e => e.status === 429);
  assert.equal(f.issued.length, 0);
});

test('HTTP custom-password endpoint requires an active teacher even while simple login is disabled', async () => {
  const f = fixture(); const handler = makeHandler('admin', async () => f.service, () => false);
  const body = { action: 'password', kind: 'bcs', studentId: '1', password: 'Test7N' };
  const before = clone([...f.db.data]);
  assert.equal((await handler(request(body))).status, 401);
  assert.equal((await handler(request(body, { Authorization: 'Bearer invalid' }))).status, 401);
  f.db.data.get(`${BASE}/members/teacher`).role = 'bcs';
  assert.equal((await handler(request(body, { Authorization: 'Bearer teacher-token' }))).status, 403);
  f.db.data.get(`${BASE}/members/teacher`).role = 'gvcn';
  assert.deepEqual([...f.db.data], before);
  const success = await handler(request(body, { Authorization: 'Bearer teacher-token' }));
  assert.equal(success.status, 200);
  assert.equal(success.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await success.json(), { passwordSet: true });
});
test('blocked access stays blocked across sync; enabling advances version again', async () => {
  const f = fixture(); await f.service.sync('teacher');
  await f.service.mutate('teacher', { action: 'toggle', kind: 'phhs', studentId: '1', active: false });
  await f.service.sync('teacher');
  await assert.rejects(login(f.service), e => e.status === 401);
  await f.service.mutate('teacher', { action: 'toggle', kind: 'phhs', studentId: '1', active: true });
  await login(f.service); assert.equal(f.issued.at(-1).claims.accessVersion, 3);
});
test('rotating a student code updates roster and invalidates old login', async () => {
  const f = fixture(); await f.service.sync('teacher');
  const { code } = await f.service.mutate('teacher', { action: 'rotate-code', kind: 'phhs', studentId: '1' });
  assert.match(code, /^\d{5}$/); assert(!['12345', '23456'].includes(code));
  await assert.rejects(login(f.service), e => e.status === 401);
  await login(f.service, code); assert.equal(f.issued.at(-1).claims.accessVersion, 2);
  assert.equal(f.db.data.get(STATE).state.students[0].code, code);
});
test('code changed directly in roster invalidates previous code even before sync', async () => {
  const f = fixture(); await f.service.sync('teacher');
  f.db.data.get(STATE).state.students[0].code = '33333';
  await assert.rejects(login(f.service), e => e.status === 401);
  await f.service.sync('teacher'); await login(f.service, '33333');
});
test('duplicate codes abort sync atomically without creating memberships', async () => {
  const f = fixture(); f.db.data.get(STATE).state.students[1].code = '12345';
  await assert.rejects(f.service.sync('teacher'), e => e.status === 409);
  assert.equal(f.db.data.size, 2);
});
test('swapped codes resolve to the correct new identities after sync', async () => {
  const f = fixture(); await f.service.sync('teacher');
  f.db.data.get(STATE).state.students[0].code = '23456'; f.db.data.get(STATE).state.students[1].code = '12345';
  await f.service.sync('teacher'); await login(f.service, '12345');
  assert.equal(f.issued.at(-1).uid, uid('phhs', 2));
});
test('removed students and removed officer assignments cannot log in', async () => {
  const f = fixture(); await f.service.sync('teacher');
  const { password } = await f.service.mutate('teacher', { action: 'password', kind: 'bcs', studentId: '1' });
  f.db.data.get(STATE).state.officerRoles = [];
  await assert.rejects(login(f.service, password, 'bcs'), e => e.status === 401);
  f.db.data.get(STATE).state.students = [];
  await assert.rejects(login(f.service), e => e.status === 401);
  await f.service.sync('teacher');
  assert.equal(f.db.data.get(`${BASE}/members/${uid('bcs', 1)}`).active, false);
});
test('persistent IP budget rejects attempt 31 and resets after five minutes', async () => {
  const f = fixture(); await f.service.sync('teacher');
  for (let i = 0; i < 30; i++) await assert.rejects(login(f.service, '99999'), e => e.status === 401);
  await assert.rejects(login(f.service), e => e.status === 429 && e.retryAfter > 0);
  assert(![...f.db.data.keys()].some(p => p.includes('192.0.2.1')));
  f.advance(300001); await login(f.service);
});
test('global budget cannot be bypassed by using many IP addresses', async () => {
  const f = fixture(); await f.service.sync('teacher');
  for (let i = 1; i <= 120; i++) await assert.rejects(login(f.service, '99999', 'phhs', `192.0.2.${i}`), e => e.status === 401);
  await assert.rejects(login(f.service, '12345', 'phhs', '192.0.2.200'), e => e.status === 429);
});
test('IPv6 rotating host bits share a rate limit key', () => {
  assert.equal(ipBucket('2001:db8:abcd:1::1'), ipBucket('2001:0db8:abcd:0001:1234::2'));
  assert.throws(() => ipBucket('not-an-ip'), AccessError);
});
test('server verifies the teacher ID token and rejects inactive or wrong role', async () => {
  const f = fixture(); assert.equal(await f.service.requireAdmin('teacher-token'), 'teacher');
  await assert.rejects(f.service.requireAdmin('forged-token'), e => e.status === 401);
  f.db.data.get(`${BASE}/members/teacher`).role = 'bcs';
  await assert.rejects(f.service.requireAdmin('teacher-token'), e => e.status === 403);
});
function request(body, extras = {}) {
  return new Request('https://example.test/.netlify/functions/simple-login', { method: 'POST', headers: { 'Content-Type': 'application/json', ...extras }, body: typeof body === 'string' ? body : JSON.stringify(body) });
}
test('HTTP rejects disabled feature, wrong method, cross-origin, malformed JSON, and large body', async () => {
  const f = fixture(); const handler = makeHandler('login', async () => f.service, () => true);
  assert.equal((await handler(new Request('https://example.test/api'))).status, 405);
  assert.equal((await handler(request({}, { Origin: 'https://evil.test' }))).status, 403);
  assert.equal((await handler(request('{invalid'))).status, 400);
  assert.equal((await handler(request('x'.repeat(5000)))).status, 413);
  assert.equal((await makeHandler('login', async () => f.service, () => false)(request({}))).status, 503);
});
test('HTTP uses only trusted context IP and does not fall back to client headers', async () => {
  const f = fixture(); await f.service.sync('teacher');
  const handler = makeHandler('login', async () => f.service, () => true);
  const result = await handler(request({ kind: 'phhs', credential: '12345' }, { 'X-Forwarded-For': '192.0.2.100' }));
  assert.equal(result.status, 503); assert.equal(f.issued.length, 0);
});
test('HTTP returns no-store tokens and generic errors without exception details', async () => {
  const f = fixture(); await f.service.sync('teacher');
  const handler = makeHandler('login', async () => f.service, () => true);
  const success = await handler(request({ kind: 'phhs', credential: '12345' }), { ip: '192.0.2.1' });
  assert.equal(success.status, 200); assert.equal(success.headers.get('cache-control'), 'no-store');
  const failing = makeHandler('login', async () => { throw new Error('private-key-test-should-not-leak'); }, () => true);
  const failure = await failing(request({}), { ip: '192.0.2.1' });
  assert.equal(failure.status, 503); assert(!(await failure.text()).includes('private-key-test'));
});
test('credential tables and old managed sessions are protected by the supplied rules', () => {
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  for (const table of ['_accessAccounts', '_accessLookups', '_accessLimits']) assert(rules.includes(`${table}/{id} { allow read, write: if false; }`));
  assert(rules.includes('request.auth.token.accessVersion == member.accessVersion'));
  assert(rules.includes("hasClassRole(appId, classId, ['phhs']) && memberStudentId(appId) == studentId"));
});
test('login UI has only one input for students/officers; teacher still has email and password', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const start = html.indexOf('function renderLoginView() {'), end = html.indexOf('window.setLoginRole =', start);
  const fn = html.slice(start, end);
  const app = { innerHTML: '' };
  const sandbox = { window: { simpleLoginEnabled: true, secureMode: true }, currentLoginRole: 'phhs',
    document: { getElementById: () => app }, state: { admin: {}, students: [], officerRoles: [] },
    roleDescriptions: {}, escapeHtmlAttr: x => x, getClassCompactLabel: () => '7N', setTimeout: () => {} };
  vm.createContext(sandbox); vm.runInContext(fn, sandbox);
  for (const role of ['phhs', 'bcs']) {
    sandbox.currentLoginRole = role; vm.runInContext('renderLoginView()', sandbox);
    assert(!app.innerHTML.includes('id="login-email"')); assert(app.innerHTML.includes('id="login-password"'));
  }
  sandbox.currentLoginRole = 'gvcn'; vm.runInContext('renderLoginView()', sandbox);
  assert(app.innerHTML.includes('id="login-email"')); assert(app.innerHTML.includes('id="login-password"'));
  sandbox.window.simpleLoginEnabled = false; sandbox.currentLoginRole = 'phhs'; vm.runInContext('renderLoginView()', sandbox);
  assert(!app.innerHTML.includes('id="login-email"'));
  assert(app.innerHTML.includes('chưa được bật'));
});
