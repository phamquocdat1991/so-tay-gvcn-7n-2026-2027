import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { fixture } from './helpers/deputy-fixture.mjs';

const source = readFileSync(new URL('../to-pho.js', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../class-dashboard.js', import.meta.url), 'utf8');

test('to-pho.js works and generates valid requestId even when crypto.randomUUID is unavailable (non-secure context)', async () => {
  const backend = fixture();
  backend.db.rows.get('artifacts/demo/members/deputy').role = 'bcs';
  backend.state().officerRoles = [{
    key: 'to-truong-1',
    title: 'Tổ trưởng Tổ 1',
    status: 'active',
    assignedStudentId: '1',
    scope: 'group',
    groupName: 'Tổ 1',
    canAccessTabs: ['tich-diem'],
    allowedCategories: ['Học tập', 'Nề nếp'],
    actions: { view: true, add: true }
  }];

  const requests = [];
  const { document, Event } = parseHTML('<html><head></head><body><div id="app"></div></body></html>');
  const prototype = Object.getPrototypeOf(document.createElement('select'));
  Object.defineProperty(prototype, 'value', {
    configurable: true,
    get() {
      const options = [...this.querySelectorAll('option')];
      return (options.find(o => o.hasAttribute('selected')) || options[0])?.getAttribute('value') ?? '';
    },
    set(v) {
      for (const o of this.querySelectorAll('option')) {
        if (o.getAttribute('value') === String(v)) o.setAttribute('selected', '');
        else o.removeAttribute('selected');
      }
    }
  });

  class DOMFormData {
    constructor(form) {
      this.values = [...form.querySelectorAll('[name]')].filter(e => !e.disabled).map(e => [e.name || e.getAttribute('name'), e.value]);
    }
    entries() { return this.values[Symbol.iterator](); }
    [Symbol.iterator]() { return this.entries(); }
    get(name) { return this.values.find(e => e[0] === name)?.[1] ?? null; }
  }

  const window = {
    cloudUser: { uid: 'student' },
    cloudMembership: { role: 'bcs' },
    cloudServices: {
      deputy: async body => {
        requests.push(body);
        return backend.service('deputy', body);
      },
      refreshSession: async () => ({ role: 'bcs' }),
      signOut: async () => {}
    }
  };

  // QUAN TRỌNG: Môi trường KHÔNG CÓ crypto.randomUUID (ví dụ HTTP thường trên mobile / LAN)
  const context = vm.createContext({
    window,
    document,
    FormData: DOMFormData,
    crypto: {}, // randomUUID is undefined!
    confirm: () => true,
    setTimeout,
    clearTimeout,
    setInterval: () => 1,
    clearInterval: () => {}
  });

  vm.runInContext(dashboard, context);
  vm.runInContext(source, context);

  await window.openDeputyWorkspace();
  document.querySelector('[data-panel-link=points]').click();
  const form = document.querySelector('#score-form');
  assert.ok(form, 'Form nhập điểm phải hiển thị thành công');

  const reqId = form.dataset.request;
  assert.ok(reqId && reqId.length >= 16, 'Request ID dự phòng phải được sinh hợp lệ');

  const studentField = form.querySelector('[name=studentId]');
  studentField.value = '2';
  const pointsField = form.querySelector('[name=points]');
  pointsField.value = '3';
  const reasonField = form.querySelector('[name=reason]');
  reasonField.value = 'Học tốt và phát biểu';

  await form.onsubmit({ preventDefault() {}, target: form });
  await new Promise(r => setImmediate(r));

  assert.equal(backend.state().students[1].points, 13, 'Điểm của học sinh phải được lưu thành công trên máy chủ');
  assert.equal(requests.length, 3); // 1 view ban đầu + 1 score lưu điểm + 1 view làm mới sau lưu
  assert.equal(requests[1].action, 'score');
  assert.equal(Number(requests[1].points), 3);
});

test('deputy-service falls back to valid default categories when allowedCategories is empty or undefined', async () => {
  const backend = fixture();
  backend.db.rows.get('artifacts/demo/members/deputy').role = 'bcs';
  // Officer role chưa cấu hình allowedCategories (undefined hoặc mảng rỗng)
  backend.state().officerRoles = [{
    key: 'to-truong-1',
    title: 'Tổ trưởng Tổ 1',
    status: 'active',
    assignedStudentId: '1',
    scope: 'group',
    groupName: 'Tổ 1',
    canAccessTabs: ['tich-diem'],
    allowedCategories: [],
    actions: { view: true, add: true }
  }];

  const viewResult = await backend.service('deputy', { action: 'view' });
  assert.ok(viewResult.permissions.categories.length > 0, 'Permissions categories phải có fallback hợp lệ');

  const scoreResult = await backend.service('deputy', {
    action: 'score',
    studentId: '2',
    points: 2,
    reason: 'Đóng góp tích cực cho tổ',
    requestId: 'test-req-id-uuid-12345678'
  });
  assert.equal(scoreResult.saved, true, 'Điểm phải được lưu thành công dù GVCN chưa kịp tích allowedCategories');
  assert.equal(backend.state().students[1].points, 12);
});
