import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function section(startMarker, endMarker) {
  const start = html.indexOf(startMarker), end = html.indexOf(endMarker, start);
  assert(start >= 0 && end > start, `Missing source: ${startMarker}`);
  return html.slice(start, end);
}
const loginSource = section('function renderLoginView()', 'window.setLoginRole =');
const submitSource = section('window.handleLoginSubmit = async function', 'window.openStudentChangePasswordModal');
const rosterSource = section('// ================= DANH SÁCH TỪ THẺ TỔNG SỐ HỌC SINH', '// ================= HỒ SƠ CHI TIẾT HỌC SINH ĐẦY ĐỦ');

// Run shipped functions with a replace-on-render DOM double. No student data,
// production credentials, real Firebase calls or browser session is used.
function loginHarness(role, enabled = true, secure = true) {
  const events = { simple: [], email: [], toasts: [], audit: [], signOut: 0 };
  const app = { innerHTML: '' };
  const elements = {
    app,
    'login-email': { value: 'Teacher@Test.invalid' },
    'login-password': { value: role === 'phhs' ? '01234' : 'Test7N' },
    'login-submit': { setAttribute() {}, removeAttribute() {}, disabled: false },
  };
  const context = {
    window: {
      secureMode: secure, simpleLoginEnabled: enabled,
      cloudServices: {
        signInSimple: async (...args) => { events.simple.push(args); return { user: { uid: 'test-uid' } }; },
        signIn: async (...args) => { events.email.push(args); return { user: { uid: 'test-uid' } }; },
        getMembership: async () => ({ role, active: true, studentId: 'fixture-1' }),
        signOut: async () => { events.signOut++; },
      },
    },
    currentLoginRole: role, failedLoginAttempts: 0,
    state: { admin: {}, students: [{ name: 'PRIVATE_ROSTER_SENTINEL' }], officerRoles: [] },
    roleDescriptions: {}, escapeHtmlAttr: x => x, getClassCompactLabel: () => '7N',
    document: { getElementById: id => elements[id] || null },
    setTimeout() {}, showToast: (...args) => events.toasts.push(args),
    recordAudit: async (...args) => events.audit.push(args),
  };
  vm.createContext(context);
  vm.runInContext(loginSource + '\n' + submitSource, context);
  context.renderLoginView();
  return { context, elements, events, app };
}

for (const role of ['bcs', 'phhs']) {
  test(`${role}: one credential only whether simple login is enabled, disabled or Firebase is missing`, () => {
    for (const [enabled, secure] of [[true, true], [false, true], [false, false]]) {
      const h = loginHarness(role, enabled, secure);
      assert.equal((h.app.innerHTML.match(/<input\b/g) || []).length, 1);
      assert(!h.app.innerHTML.includes('id="login-email"'));
      assert(!h.app.innerHTML.includes('<select'));
      assert(!h.app.innerHTML.includes('requestPasswordReset()'));
      assert(!h.app.innerHTML.includes('PRIVATE_ROSTER_SENTINEL'));
      assert.equal(h.app.innerHTML.includes('chưa được bật'), !enabled);
      assert(h.app.innerHTML.includes(role === 'phhs' ? 'maxlength="5"' : 'maxlength="128"'));
    }
  });

  test(`${role}: submits only the typed credential through simple authentication`, async () => {
    const h = loginHarness(role);
    delete h.elements['login-email'];
    await h.context.window.handleLoginSubmit();
    assert.deepEqual(h.events.simple, [[role, h.elements['login-password'].value]]);
    assert.deepEqual(h.events.email, []);
    assert.equal(h.events.audit.length, 1);
    assert.equal(h.events.toasts.length, 0);
    assert.equal(h.context.window.loginRequestPending, false);
  });

  test(`${role}: disabled feature never falls back to email or bypasses server authentication`, async () => {
    const h = loginHarness(role, false);
    await h.context.window.handleLoginSubmit();
    assert.deepEqual(h.events.simple, []);
    assert.deepEqual(h.events.email, []);
    assert.equal(h.events.audit.length, 0);
    assert.match(h.events.toasts[0][0], /chưa được bật/);
  });
}

test('all teacher roles retain two fields and email authentication with feature on or off', async () => {
  for (const enabled of [true, false]) for (const role of ['gvcn', 'gvbm', 'bgh']) {
    const h = loginHarness(role, enabled);
    assert.equal((h.app.innerHTML.match(/<input\b/g) || []).length, 2);
    assert(h.app.innerHTML.includes('id="login-email"'));
    await h.context.window.handleLoginSubmit();
    assert.deepEqual(h.events.email, [['teacher@test.invalid', 'Test7N']]);
    assert.deepEqual(h.events.simple, []);
  }
});

test('student login preserves a leading zero and rejects malformed codes before any request', async () => {
  for (const value of ['', '1234', '123456', '12a45', ' 12345']) {
    const h = loginHarness('phhs');
    h.elements['login-password'].value = value;
    await h.context.window.handleLoginSubmit();
    assert.equal(h.events.simple.length, 0);
    assert.match(h.events.toasts[0][0], /5 chữ số/);
  }
});

test('simple login still rejects inactive, wrong-role and unlinked memberships', async () => {
  for (const membership of [
    { role: 'bcs', active: false, studentId: 'fixture-1' },
    { role: 'gvcn', active: true, studentId: 'fixture-1' },
    { role: 'bcs', active: true },
  ]) {
    const h = loginHarness('bcs');
    h.context.window.cloudServices.getMembership = async () => membership;
    await h.context.window.handleLoginSubmit();
    assert.equal(h.events.signOut, 1);
    assert.equal(h.events.audit.length, 0);
    assert.equal(h.elements['login-password'].value, '');
    assert.equal(h.elements['login-submit'].disabled, false);
  }
});

test('double submit stays blocked while simple login is pending', async () => {
  const h = loginHarness('bcs');
  let finish;
  h.context.window.cloudServices.signInSimple = () => new Promise(resolve => { finish = resolve; h.events.simple.push('pending'); });
  const first = h.context.window.handleLoginSubmit();
  await h.context.window.handleLoginSubmit();
  assert.equal(h.events.simple.length, 1);
  finish({ user: { uid: 'test-uid' } });
  await first;
  assert.equal(h.context.window.loginRequestPending, false);
});
test('deputy uses the BCS login form without a separate link or role selector', async () => {
  const h = loginHarness('bcs');
  h.context.window.cloudServices.getMembership = async () => ({role:'to_pho',active:true,studentId:'fixture-1',groupId:'Tổ 1'});
  await h.context.window.handleLoginSubmit();
  assert.deepEqual(h.events.simple,[['bcs','Test7N']]);
  assert.equal(h.events.signOut,0); assert.equal(h.events.toasts.length,0);
  assert(!h.app.innerHTML.includes('/to-pho.html'));
  assert.equal((h.app.innerHTML.match(/<input\b/g)||[]).length,1);
});
test('deputy cannot enter through the parent option or without a student association', async () => {
  for (const [role,studentId] of [['phhs','fixture-1'],['bcs',undefined]]) {
    const h=loginHarness(role);
    h.context.window.cloudServices.getMembership=async()=>({role:'to_pho',active:true,studentId});
    await h.context.window.handleLoginSubmit(); assert.equal(h.events.signOut,1);
  }
});
for (const memberRole of ['to_pho','bcs']) test(`deputy/officer ${memberRole} startup stays on shared page without full class state`, () => {
  let mounted=0, unsubscribed=0;
  const context={window:{cloudMembership:{role:memberRole},openDeputyWorkspace:()=>mounted++,
    location:{replace:()=>{throw new Error('unexpected separate portal');}},
    cloudServices:{subscribeState:()=>{throw new Error('full class access');}}},
    cloudStateUnsubscribe:()=>unsubscribed++,state:{students:[{name:'PRIVATE'}]},APP_EMPTY_STATE_TEMPLATE:{students:[]},isDataLoaded:false};
  vm.createContext(context);
  vm.runInContext(section('window.startApp = function()', 'function fallbackLoad('),context);
  context.window.startApp();assert.equal(mounted,1);assert.equal(unsubscribed,1);assert.equal(context.state.students.length,0);
});

const fixtures = [
  { id: 1, name: 'Đặng Ánh', group: 'Tổ 1', code: '01234', studentId: 'HS-A' },
  { id: '2', name: 'Bình', group: 'Tổ 2', code: 56789, studentId: 22 },
  { id: 3, name: 'Chi', group: 'Tổ 1', code: '33333', studentId: 'HS-C' },
];
function rosterHarness({ students = fixtures, role = 'gvcn', authenticated = true,
  allowed = true, officer = null } = {}) {
  const events = { profiles: [], toasts: [], cardFocus: 0, searchFocus: 0 };
  let markup = '', input;
  const modal = {
    get innerHTML() { return markup; },
    set innerHTML(value) {
      markup = value;
      input = value ? {
        selectionStart: 0, selectionEnd: 0,
        focus() { events.searchFocus++; },
        setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; },
      } : null;
    },
  };
  const context = {
    window: { openDetailedStudentProfile: id => events.profiles.push(id) },
    state: { students: structuredClone(students) }, isAuthenticated: authenticated,
    currentLoginRole: role, canAccessTab: tab => tab === 'hoc-sinh' && allowed,
    getCurrentOfficerRole: () => officer,
    document: { getElementById: id => ({
      'modal-container': modal, 'student-list-search': input,
      'total-students-card': { focus() { events.cardFocus++; } },
    })[id] || null },
    closeModal: () => { modal.innerHTML = ''; },
    showToast: (...args) => events.toasts.push(args),
  };
  vm.createContext(context);
  vm.runInContext(section('function getAvatarImg(', '// ================= HÀM TIỆN ÍCH QUẢN TRỊ QUYỀN RBAC') + rosterSource, context);
  return { context, modal, events, input: () => input };
}

test('total-students card connects mouse and Enter/Space to an existing handler', () => {
  const card = html.match(/<div id="total-students-card"[^>]*>/)?.[0];
  assert(card);
  assert.match(card, /role="button" tabindex="0"/);
  assert.match(card, /onclick="openStudentListModal\(\)"/);
  assert.match(card, /event.key === 'Enter' \|\| event.key === ' '/);
  const h = rosterHarness();
  h.context.openStudentListModal();
  assert.match(h.modal.innerHTML, /3 \/ 3 học sinh/);
  assert.match(h.modal.innerHTML, /Đặng Ánh/);
  assert.match(h.modal.innerHTML, /role="dialog"/);
  assert.equal(h.events.searchFocus, 1);
  assert.equal(h.events.toasts.length, 0);
});

test('roster counts actual data, not a hardcoded 51 or 54', () => {
  const students = Array.from({ length: 51 }, (_, i) => ({ id: i + 1, name: `Fixture ${i + 1}` }));
  const h = rosterHarness({ students });
  h.context.openStudentListModal();
  assert.match(h.modal.innerHTML, /51 \/ 51 học sinh/);
  h.context.state.students.pop();
  h.context.openStudentListModal();
  assert.match(h.modal.innerHTML, /50 \/ 50 học sinh/);
});

test('search handles Vietnamese accents, uppercase, numeric codes and student IDs', () => {
  const h = rosterHarness();
  for (const query of ['dang anh', 'ĐẶNG ÁNH', '01234', 'hs-a', '56789', '22']) {
    h.context.searchStudentList(query);
    assert.match(h.modal.innerHTML, /1 \/ 3 học sinh/);
  }
});

test('search preserves raw input, focus and selection across repeated renders', () => {
  const h = rosterHarness();
  h.context.openStudentListModal();
  for (const query of ['Đ', 'Đặ', 'Đặng', ' Đặng Ánh ']) {
    const oldInput = h.input();
    oldInput.selectionStart = oldInput.selectionEnd = query.length;
    h.context.searchStudentList(query);
    assert.notEqual(h.input(), oldInput);
    assert.equal(h.input().selectionStart, query.length);
    assert.equal(h.input().selectionEnd, query.length);
    assert(h.modal.innerHTML.includes(`value="${query}"`));
  }
  assert.equal(h.events.searchFocus, 5);
  assert.match(h.modal.innerHTML, /if\(!event.isComposing\)/);
  assert.match(h.modal.innerHTML, /oncompositionend="searchStudentList\(this.value\)"/);
});

test('group filters combine with search; reopening resets filters and returns focus on close', () => {
  const h = rosterHarness();
  h.context.openStudentListModal();
  h.context.filterStudentListByGroup('Tổ 1');
  assert.match(h.modal.innerHTML, /2 \/ 3 học sinh/);
  h.context.searchStudentList('Chi');
  assert.match(h.modal.innerHTML, /1 \/ 3 học sinh/);
  h.context.filterStudentListByGroup('Tổ 2');
  assert.match(h.modal.innerHTML, /0 \/ 3 học sinh/);
  assert.match(h.modal.innerHTML, /Không tìm thấy học sinh phù hợp/);
  h.context.closeStudentListModal();
  assert.equal(h.modal.innerHTML, '');
  assert.equal(h.events.cardFocus, 1);
  h.context.openStudentListModal();
  assert.match(h.modal.innerHTML, /3 \/ 3 học sinh/);
  assert.match(h.modal.innerHTML, /value=""/);
});

test('empty roster and students with missing optional fields render without errors', () => {
  for (const students of [[], [{ id: 1 }]]) {
    const h = rosterHarness({ students });
    h.context.openStudentListModal();
    h.context.searchStudentList('anything');
    assert.match(h.modal.innerHTML, /Không tìm thấy học sinh phù hợp/);
    assert.equal(h.events.toasts.length, 0);
  }
});

test('student text, avatar attributes, group names, IDs and search text are HTML-escaped', () => {
  const unsafe = '\"><img src=x onerror=alert(1)>';
  const h = rosterHarness({ students: [{ id: unsafe, name: unsafe, group: unsafe,
    code: unsafe, parentName: unsafe, parentPhone: unsafe, address: unsafe,
    avatarUrl: 'https://example.invalid/" onerror="alert(1)' }] });
  h.context.openStudentListModal();
  assert(!h.modal.innerHTML.includes('<img src=x'));
  assert(!h.modal.innerHTML.includes('src="https://example.invalid/" onerror='));
  assert(h.modal.innerHTML.includes('&lt;img'));
  h.context.searchStudentList(unsafe);
  assert(!h.modal.innerHTML.includes('value="' + unsafe));
});

test('both table and mobile entries open the matching profile by internal ID, never login code', () => {
  const h = rosterHarness();
  h.context.openStudentListModal();
  assert.match(h.modal.innerHTML, /data-student-id="1" onclick="openStudentListProfile\(this.dataset.studentId\)"/);
  h.context.openStudentListProfile('1');
  h.context.openStudentListProfile(2);
  h.context.openStudentListProfile('01234');
  assert.deepEqual(h.events.profiles, [1, '2']);
  assert.equal(h.events.toasts.length, 1);
  assert.match(html, /state.students.find\(x => String\(x.id\) === String\(id\)\)/);
});

test('anonymous, HS/PH and roles without directory permission cannot open roster or its profiles', () => {
  for (const options of [{ authenticated: false }, { role: 'phhs', allowed: false },
    { role: 'bcs', allowed: false }, { role: 'bgh', allowed: false }]) {
    const h = rosterHarness(options);
    h.context.openStudentListModal();
    h.context.openStudentListProfile('1');
    assert.equal(h.modal.innerHTML, '');
    assert.equal(h.events.profiles.length, 0);
    assert.equal(h.events.toasts.length, 2);
  }
});

test('officers can only list and open profiles in their currently assigned scope', () => {
  const officer = { scope: 'group', groupName: 'Tổ 1', actions: { view: true } };
  const h = rosterHarness({ role: 'bcs', officer });
  h.context.openStudentListModal();
  assert.match(h.modal.innerHTML, /2 \/ 2 học sinh/);
  assert(!h.modal.innerHTML.includes('Bình'));
  assert(!h.modal.innerHTML.includes('data-group="Tổ 2"'));
  h.context.openStudentListProfile('2');
  assert.equal(h.events.profiles.length, 0);
  h.context.openStudentListProfile('1');
  assert.deepEqual(h.events.profiles, [1]);
  officer.actions.view = false;
  h.context.openStudentListModal();
  assert.equal(h.modal.innerHTML, '');
});
