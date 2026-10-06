import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function section(startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  assert(start >= 0 && end > start, `Missing startup source: ${startMarker}`);
  return html.slice(start, end);
}
const authAndStartup = section('window.handleCloudAuthState = function', '        function fallbackLoad');
const bootTimer = section('// Fallback khởi động:', '</script>');

// Execute the shipped handlers, not a reimplementation. Firebase, storage and
// rendering are test doubles; no credentials, real browser or network is used.
function harness({ secure = true, useCloud = true } = {}) {
  const events = { view: 'empty', starts: 0, stops: 0, fallbacks: 0, writes: 0, errors: [], toasts: [] };
  const subscriptions = [];
  const session = new Map();
  const subscribe = (kind, studentId, onData, onError) => {
    events.starts++;
    subscriptions.push({ kind, studentId, onData, onError });
    return () => { events.stops++; };
  };
  const context = {
    window: {
      secureMode: secure, useCloud, cloudUser: null, cloudMembership: null,
      cloudServices: {
        subscribeState: (onData, onError) => subscribe('class', null, onData, onError),
        subscribeStudentView: (id, onData, onError) => subscribe('student', id, onData, onError),
      },
    },
    isAuthenticated: false, publicPortalActive: false, publicStudentId: '',
    loggedInStudentId: '', currentLoginRole: 'gvcn', isDataLoaded: false,
    cloudStateUnsubscribe: null, lastSavedStateSignature: '', state: {},
    APP_EMPTY_STATE_TEMPLATE: {},
    sessionStorage: { setItem: (key, value) => session.set(key, value), removeItem: key => session.delete(key) },
    console: { error: (...args) => events.errors.push(args) },
    setTimeout: (callback, ms) => { assert.equal(ms, 1800); events.timer = callback; },
    renderCloudLoadingView: () => { events.view = 'waiting'; },
    renderLoginView: () => { events.view = 'login'; },
    renderLayout: () => {
      events.view = context.publicPortalActive ? 'student' : (context.isAuthenticated ? 'main' : 'login');
    },
    fallbackLoad: (firstSync, loginOnly) => {
      events.fallbacks++;
      context.isDataLoaded = true;
      events.view = loginOnly || !context.isAuthenticated ? 'login' : 'main';
    },
    applyStateDefaults() {},
    getCloudSafeState: () => context.state,
    saveData: async () => { events.writes++; },
    showToast: (...args) => events.toasts.push(args),
  };
  vm.createContext(context);
  vm.runInContext(authAndStartup, context);
  vm.runInContext(bootTimer, context);
  const auth = (membership = { role: 'gvcn', active: true }, error = '') => {
    context.window.cloudUser = membership ? { uid: 'test-only-uid' } : null;
    context.window.cloudMembership = membership;
    context.window.handleCloudAuthState(context.window.cloudUser, membership, error);
  };
  const snapshot = async (state = { students: [] }) => {
    assert(subscriptions.length > 0, 'No Firestore subscription started');
    await subscriptions.at(-1).onData({ exists: () => true, data: () => ({ state }) });
  };
  return { context, events, subscriptions, session, auth, snapshot };
}

test('slow membership lookup does not turn off Firebase; eventual auth opens the main screen', async () => {
  const h = harness();
  h.events.timer();
  assert.equal(h.context.window.useCloud, true);
  assert.equal(h.events.fallbacks, 0);
  assert.equal(h.events.view, 'waiting');
  h.auth();
  assert.equal(h.events.starts, 1);
  await h.snapshot({ students: [{ id: 'student-test' }], currentTab: 'tong-quan' });
  assert.equal(h.events.view, 'main');
  assert.equal(h.events.writes, 0);
});

test('a slow first class snapshot keeps the original listener and eventually opens the main screen', async () => {
  const h = harness();
  h.auth();
  assert.equal(h.events.starts, 1);
  h.events.timer();
  assert.equal(h.context.window.useCloud, true);
  assert.equal(h.events.stops, 0);
  assert.equal(h.events.starts, 1);
  assert.equal(h.events.fallbacks, 0);
  await h.snapshot();
  assert.equal(h.events.view, 'main');
});

test('Firebase SDK arriving after the startup timer still resumes secure login', async () => {
  const h = harness({ useCloud: false });
  h.events.timer();
  assert.equal(h.events.view, 'login');
  assert.equal(h.context.isAuthenticated, false);
  h.context.window.useCloud = true;
  h.auth();
  await h.snapshot();
  assert.equal(h.events.view, 'main');
  assert.equal(h.events.writes, 0);
});

test('the startup timer does not replace an already loaded main screen', async () => {
  const h = harness();
  h.auth();
  await h.snapshot();
  h.events.timer();
  assert.equal(h.events.view, 'main');
  assert.equal(h.events.starts, 1);
  assert.equal(h.events.stops, 0);
});

test('Firestore permission errors stay visible and do not fall back to local admin data', () => {
  const h = harness();
  h.auth();
  h.subscriptions[0].onError({ code: 'permission-denied' });
  h.events.timer();
  assert.equal(h.events.view, 'login');
  assert.equal(h.events.errors.length, 1);
  assert.equal(h.events.toasts.at(-1)[1], 'error');
  assert.equal(h.events.fallbacks, 0);
  assert.equal(h.events.writes, 0);
});

test('a rejected membership does not start a data listener or enter the main screen', () => {
  const h = harness();
  h.events.timer();
  h.auth(null, 'Tài khoản chưa được cấp quyền hoặc đã bị khóa.');
  assert.equal(h.events.view, 'login');
  assert.equal(h.events.starts, 0);
  assert.equal(h.context.isAuthenticated, false);
  assert.equal(h.session.has('isAuth'), false);
});

test('slow HS/PH startup only subscribes to the assigned student view', async () => {
  const h = harness();
  h.auth({ active: true, role: 'phhs', studentId: 'student-test' });
  h.events.timer();
  assert.equal(h.events.starts, 1);
  assert.equal(h.events.stops, 0);
  assert.equal(h.subscriptions[0].kind, 'student');
  assert.equal(h.subscriptions[0].studentId, 'student-test');
  await h.snapshot({ students: [{ id: 'student-test' }] });
  assert.equal(h.events.view, 'student');
  assert.equal(h.context.isAuthenticated, false);
  assert.equal(h.events.writes, 0);
});

test('an HS/PH membership without studentId cannot subscribe to class data', () => {
  const h = harness();
  h.auth({ active: true, role: 'phhs' });
  assert.equal(h.events.view, 'login');
  assert.equal(h.events.starts, 0);
  assert.equal(h.events.toasts.at(-1)[1], 'error');
});

test('an SDK initialization failure remains locked instead of opening a local admin session', () => {
  const h = harness({ useCloud: false });
  h.context.window.cloudInitError = 'Simulated network failure';
  h.events.timer();
  assert.equal(h.context.window.secureMode, true);
  assert.equal(h.events.view, 'login');
  assert.equal(h.context.isAuthenticated, false);
  assert.equal(h.events.starts, 0);
  assert.equal(h.events.writes, 0);
});

test('startup without Firebase configuration stays on the locked login screen', () => {
  const h = harness({ secure: false, useCloud: false });
  h.events.timer();
  assert.equal(h.events.view, 'login');
  assert.equal(h.context.isAuthenticated, false);
  assert.equal(h.events.writes, 0);
});

test('signing out while the first snapshot is pending cancels the listener and stays on login', () => {
  const h = harness();
  h.auth();
  h.auth(null);
  h.events.timer();
  assert.equal(h.events.stops, 1);
  assert.equal(h.events.view, 'login');
  assert.equal(h.context.isAuthenticated, false);
});

test('sign-in does not announce that the main screen succeeded before the data listener finishes', async () => {
  const h = harness();
  const fields = { 'login-email': { value: 'teacher@example.invalid' }, 'login-password': { value: 'test-only' } };
  h.context.document = { getElementById: id => fields[id] || null };
  h.context.failedLoginAttempts = 0;
  h.context.recordAudit = async () => {};
  h.context.window.cloudServices.signIn = async () => ({ user: { uid: 'test-only-uid' } });
  h.context.window.cloudServices.getMembership = async () => ({ role: 'gvcn', active: true });
  vm.runInContext(section('window.handleLoginSubmit = async function', '        window.openStudentChangePasswordModal'), h.context);
  await h.context.window.handleLoginSubmit();
  assert.equal(h.context.window.loginRequestPending, false);
  assert.equal(h.events.toasts.some(([message]) => message === 'Đăng nhập an toàn thành công.'), false);
  assert.equal(h.events.view, 'empty');
});

test('the actual waiting view renders a status without exposing local class data or changing cloud state', () => {
  const app = { innerHTML: '' };
  const context = {
    document: { getElementById: id => id === 'app' ? app : null },
    window: { useCloud: true },
    state: { students: [{ name: 'PRIVATE_STUDENT_SENTINEL' }] },
  };
  vm.createContext(context);
  vm.runInContext(section('function renderCloudLoadingView()', '        window.handleCloudAuthState') + '\nrenderCloudLoadingView();', context);
  assert.match(app.innerHTML, /Đang mở sổ tay lớp/);
  assert.match(app.innerHTML, /role="status" aria-live="polite"/);
  assert(!app.innerHTML.includes('PRIVATE_STUDENT_SENTINEL'));
  assert.equal(context.window.useCloud, true);
});
