// Run only against a local emulator; never against the production project.
const { before, after, test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc } = require('firebase/firestore');
const projectId = 'demo-gvcn-login';
const base = 'artifacts/so-tay-gvcn-7n';
const classBase = `${base}/classes/7n`;
let env;
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Local emulator is required.');
  env = await initializeTestEnvironment({ projectId, firestore: {
    rules: fs.readFileSync(path.join(__dirname, '../firestore.rules'), 'utf8'),
  } });
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    const values = {
      [`${base}/members/teacher`]: { active: true, role: 'gvcn' },
      [`${base}/members/deputy`]: { active: true, role: 'to_pho', studentId: '1', groupId: 'Tổ 1', classId: '7n', authMode: 'simple', accessVersion: 1 },
      [`${base}/members/pupil`]: { active: true, role: 'phhs', studentId: '1', authMode: 'simple', classId: '7n', accessVersion: 2 },
      [`${base}/members/officer`]: { active: true, role: 'bcs', studentId: '2', authMode: 'simple', classId: '7n', accessVersion: 3 },
      [`${base}/members/blocked`]: { active: false, role: 'phhs', studentId: '1', authMode: 'simple', classId: '7n', accessVersion: 1 },
      [`${classBase}/state/main`]: { state: { students: [], attendanceRecords: {}, admin: {} } },
      [`${classBase}/studentViews/1`]: { state: { students: [{ id: 1 }] } },
      [`${classBase}/studentViews/2`]: { state: { students: [{ id: 2 }] } },
      [`${base}/classes/8n/studentViews/1`]: { state: {} },
      [`${base}/classes/8n/state/main`]: { state: {} },
      [`${base}/_accessAccounts/private`]: { digest: 'private-test-value' },
      [`${base}/_accessLookups/private`]: { uid: 'pupil' },
      [`${base}/_accessLimits/private`]: { count: 1 },
    };
    await Promise.all(Object.entries(values).map(([key, value]) => setDoc(doc(db, key), value)));
  });
});
after(async () => { if (env) await env.cleanup(); });

test('anonymous requests cannot read class, member, or student data', async () => {
  const db = env.unauthenticatedContext().firestore();
  for (const key of [`${classBase}/state/main`, `${base}/members/pupil`, `${classBase}/studentViews/1`]) {
    await assertFails(getDoc(doc(db, key)));
  }
});
test('deputy cannot bypass its API through direct Firestore access', async () => {
  const db = env.authenticatedContext('deputy', { accessVersion: 1 }).firestore();
  await assertSucceeds(getDoc(doc(db, `${base}/members/deputy`)));
  for (const key of [`${classBase}/state/main`, `${classBase}/studentViews/1`, `${classBase}/studentViews/2`, `${classBase}/scoreProposals/test`, `${base}/members/teacher`]) {
    await assertFails(getDoc(doc(db, key)));
    await assertFails(setDoc(doc(db, key), { active: true, role: 'gvcn' }));
  }
  await assertFails(updateDoc(doc(db, `${base}/members/deputy`), { role: 'gvcn' }));
});
test('a current student session can read only its own class profile', async () => {
  const db = env.authenticatedContext('pupil', { accessVersion: 2 }).firestore();
  await assertSucceeds(getDoc(doc(db, `${classBase}/studentViews/1`)));
  for (const key of [`${classBase}/studentViews/2`, `${classBase}/state/main`, `${base}/classes/8n/studentViews/1`]) {
    await assertFails(getDoc(doc(db, key)));
  }
  await assertFails(setDoc(doc(db, `${classBase}/studentViews/1`), { state: {} }));
  await assertFails(updateDoc(doc(db, `${base}/members/pupil`), { role: 'gvcn' }));
});
test('old or missing session versions and disabled accounts are rejected', async () => {
  for (const [uid, claims] of [['pupil', { accessVersion: 1 }], ['pupil', {}], ['blocked', { accessVersion: 1 }]]) {
    await assertFails(getDoc(doc(env.authenticatedContext(uid, claims).firestore(), `${classBase}/studentViews/1`)));
  }
});
test('resetting membership version rejects a previously valid token', async () => {
  const db = env.authenticatedContext('officer', { accessVersion: 3 }).firestore();
  await assertSucceeds(getDoc(doc(db, `${classBase}/state/main`)));
  await env.withSecurityRulesDisabled(context => updateDoc(doc(context.firestore(), `${base}/members/officer`), { accessVersion: 4 }));
  await assertFails(getDoc(doc(db, `${classBase}/state/main`)));
});
test('officers are class-scoped and cannot edit admin fields', async () => {
  const db = env.authenticatedContext('officer', { accessVersion: 4 }).firestore();
  await assertSucceeds(getDoc(doc(db, `${classBase}/state/main`)));
  await assertSucceeds(updateDoc(doc(db, `${classBase}/state/main`), { 'state.attendanceRecords': { today: {} } }));
  await assertFails(getDoc(doc(db, `${base}/classes/8n/state/main`)));
  await assertFails(updateDoc(doc(db, `${classBase}/state/main`), { 'state.admin': { hacked: true } }));
  await assertFails(updateDoc(doc(db, `${base}/members/officer`), { role: 'gvcn' }));
});
test('existing teacher membership keeps normal class access', async () => {
  const db = env.authenticatedContext('teacher').firestore();
  await assertSucceeds(getDoc(doc(db, `${classBase}/state/main`)));
  await assertSucceeds(updateDoc(doc(db, `${classBase}/state/main`), { 'state.admin': { name: 'Teacher' } }));
  await assertSucceeds(getDoc(doc(db, `${classBase}/studentViews/1`)));
});
test('credential stores are unavailable to every browser role including teacher', async () => {
  for (const uid of ['teacher', 'pupil', 'officer']) {
    const db = env.authenticatedContext(uid, { accessVersion: uid === 'pupil' ? 2 : 4 }).firestore();
    for (const name of ['_accessAccounts', '_accessLookups', '_accessLimits']) {
      await assertFails(getDoc(doc(db, `${base}/${name}/private`)));
      await assertFails(setDoc(doc(db, `${base}/${name}/new`), { value: true }));
    }
  }
});

test('access service transactions run against the real Firestore emulator SDK', async () => {
  const { initializeApp, deleteApp } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const { createAccessService } = await import('../server/access-service.mjs');
  const admin = initializeApp({ projectId }, 'test-service-emulator');
  try {
    const db = getFirestore(admin);
    const state = db.doc('artifacts/service-test/classes/7n/state/main');
    await state.set({ state: {
      students: [{ id: 1, name: 'Test student', code: '12345' }],
      officerRoles: [{ status: 'active', assignedStudentId: '1', title: 'Leader' }],
    } });
    const service = createAccessService({ db, appId: 'service-test', classId: '7n',
      secret: 'test-only-emulator-secret-not-for-production',
      auth: { async createCustomToken(uid, claims) { return JSON.stringify({ uid, claims }); } },
    });
    const assert = require('node:assert/strict');
    assert.equal((await service.sync('teacher')).count, 1);
    assert((await service.login({ kind: 'phhs', credential: '12345' }, '192.0.2.1')).token);
    const { password } = await service.mutate('teacher', { action: 'password', kind: 'bcs', studentId: '1' });
    assert((await service.login({ kind: 'bcs', credential: password }, '192.0.2.1')).token);
    await service.mutate('teacher', { action: 'toggle', kind: 'bcs', studentId: '1', active: false });
    await assert.rejects(service.login({ kind: 'bcs', credential: password }, '192.0.2.1'), e => e.status === 401);
    const { code } = await service.mutate('teacher', { action: 'rotate-code', kind: 'phhs', studentId: '1' });
    assert.equal((await state.get()).data().state.students[0].code, code);
    await assert.rejects(service.login({ kind: 'phhs', credential: '12345' }, '192.0.2.1'), e => e.status === 401);
    assert((await service.login({ kind: 'phhs', credential: code }, '192.0.2.1')).token);
  } finally { await deleteApp(admin); }
});
