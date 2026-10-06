import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function section(startMarker, endMarker) {
  const start = html.indexOf(startMarker), end = html.indexOf(endMarker, start);
  assert(start >= 0 && end > start, startMarker);
  return html.slice(start, end);
}
const renderSource = section('        function normalizeStudentRoleLabel', '        // ================= GIAO DIỆN TÍCH ĐIỂM RBAC');
const filterSource = section('        window.filterStudentCards = function()', '        function normalizeStudentRoleLabel');
const menuSource = section('        function toggleStudentMenu(event, id)', '        // Tự động đóng menu khi click');
const css = section('<style id="student-directory-layout-compact">', '</style>');
const pupils = [
  { id: 1, name: 'Học sinh thử nghiệm có tên dài để kiểm tra', group: 'Tổ 1', role: 'Lớp trưởng, Tổ trưởng Tổ 1', code: '01234', points: -15 },
  { id: 2, name: 'Học sinh mẫu B', group: 'Tổ 2', role: '', code: '56789', points: 1000 },
];
function harness({ role = 'gvcn', officer = null, query = '', group = 'all', students = pupils } = {}) {
  const context = {
    window: { studentDirectoryUi: { query, group } }, currentLoginRole: role,
    state: { students: structuredClone(students), groups: [{ name: 'Tổ 1', color: 'green' }, { name: 'Tổ 2', color: 'yellow' }], theme: {} },
    getCurrentOfficerRole: () => officer,
    parseTagsList: value => String(value || '').split(','),
    escapeHtmlAttr: value => String(value ?? '').replace(/"/g, '&quot;'),
    getAvatarImg: () => '<img alt="Ảnh đại diện mẫu">',
  };
  vm.createContext(context);
  vm.runInContext(renderSource, context);
  return { context, markup: context.renderViewHocSinh() };
}

// Structural helper for these templates (not a general HTML/browser renderer).
// Verifies actual parentage after moving the menu and score between containers.
function nodes(markup) {
  const result = [], stack = [];
  const voidTags = new Set(['img', 'input', 'br', 'hr', 'meta', 'link']);
  for (const m of markup.matchAll(/<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi)) {
    if (m[0].startsWith('</')) {
      assert.equal(stack.pop()?.tag, m[1], `Unbalanced tag ${m[0]}`);
    } else {
      const node = { tag: m[1], text: m[0], parents: [...stack], classes: m[0].match(/class="([^"]*)"/)?.[1].split(/\s+/) || [] };
      result.push(node);
      if (!voidTags.has(node.tag)) stack.push(node);
    }
  }
  assert.equal(stack.length, 0);
  return result;
}

test('grid responds to its own width without an undeclared query container', () => {
  assert.match(css, /repeat\(auto-fill, minmax\(min\(100%, 360px\), 1fr\)\)/);
  assert.match(css, /max-width: 1320px/);
  assert.match(css, /gap: 12px !important/);
  assert(!css.includes('@container'));
  // Formula check only; browser pixel layout is checked separately when available.
  const columns = width => Math.max(1, Math.floor((Math.min(width, 1320) + 12) / (360 + 12)));
  for (const [width, expected] of [[320,1], [375,1], [640,1], [732,2], [900,2], [1100,2], [1104,3], [1320,3], [1920,3]]) {
    assert.equal(columns(width), expected);
  }
});

test('cards no longer force tall whitespace; names and role badges can wrap', () => {
  assert.match(css, /min-height: 0 !important/);
  assert.match(css, /padding: 7px 10px !important/);
  assert.match(css, /align-items: start/);
  assert(!css.includes('min-height: 116px'));
  assert.match(css, /overflow-wrap: anywhere/);
  const names = nodes(harness().markup).filter(n => n.classes.includes('student-card-name'));
  assert.equal(names.length, 2);
  assert(names.every(n => !n.classes.includes('truncate')));
});

test('minus, score, plus, profile and menu share the compact action container in order', () => {
  const tree = nodes(harness().markup);
  const targets = tree.filter(n => ['student-card-action', 'student-card-score-box', 'student-card-profile-btn', 'student-card-menu'].some(c => n.classes.includes(c)));
  assert.equal(targets.length, 10);
  assert(targets.every(n => n.parents.at(-1).classes.includes('student-card-actions')));
  assert.deepEqual(targets.slice(0,5).map(n => n.classes[0]), [
    'student-card-action', 'student-card-score-box', 'student-card-action', 'student-card-profile-btn', 'student-card-menu',
  ]);
  assert(!css.includes('margin-left: auto'));
  assert.match(css, /flex-wrap: wrap/);
});

test('student IDs, live score targets, menu and profile handlers remain connected', () => {
  const { markup } = harness();
  for (const s of pupils) {
    assert(markup.includes(`id="student-card-score-${s.id}"`));
    assert(markup.includes(`id="student-menu-${s.id}"`));
    assert(markup.includes(`id="student-quick-points-${s.id}"`));
    assert(markup.includes(`toggleStudentQuickPointsMenu(event, ${s.id}, 'subtract')`));
    assert(markup.includes(`toggleStudentQuickPointsMenu(event, ${s.id}, 'add')`));
    assert(markup.includes(`openStudentProfileModal(${s.id})`));
    assert(markup.includes(`toggleStudentMenu(event, ${s.id})`));
    assert(markup.includes(`>${s.points}</div>`));
  }
});

test('role permissions for points and editing are unchanged by the layout', () => {
  for (const [role, officer, pointsAllowed] of [
    ['gvcn',null,true], ['bcs',{actions:{add:true}},true], ['bcs',{actions:{add:false}},false], ['bgh',null,false],
  ]) {
    const { markup } = harness({role,officer});
    assert.equal(markup.includes("toggleStudentQuickPointsMenu(event, 1, 'add')"), pointsAllowed);
    assert.equal(markup.includes('openEditStudentModal(1)'), role === 'gvcn');
    assert.equal(markup.includes('deleteStudent(1)'), role === 'gvcn');
  }
});

test('initial search/group filtering and empty states still render correctly', () => {
  const filtered = harness({ query: '01234', group: 'Tổ 1' }).markup;
  const cards = nodes(filtered).filter(n => n.text.includes('data-student-card'));
  assert.equal(cards.length, 2);
  assert(!cards[0].classes.includes('hidden'));
  assert(cards[1].classes.includes('hidden'));
  assert.match(harness({ students: [] }).markup, /Chưa có học sinh nào/);
  const noMatch = nodes(harness({ query: 'NO_MATCH' }).markup).find(n => n.text.includes('id="student-directory-empty-filter"'));
  assert(!noMatch.classes.includes('hidden'));
});

test('live search/group filtering and clear do not replace cards or lose the search control', () => {
  const classList = () => {
    const values = new Set();
    return { add: s => values.add(s), contains: s => values.has(s), toggle: (s, enabled) => enabled ? values.add(s) : values.delete(s) };
  };
  const cards = pupils.map(s => ({ dataset: { search: `${s.name} ${s.code}`.toLowerCase(), group: s.group }, classList: classList() }));
  const input = { value: '01234', focus() { this.focused = true; } };
  const select = { value: 'Tổ 1' }, counter = {}, empty = { classList: classList() };
  const context = { window: {}, document: {
    getElementById: id => ({ 'student-directory-search': input, 'student-directory-group': select, 'student-directory-count': counter, 'student-directory-empty-filter': empty })[id],
    querySelectorAll: () => cards,
  } };
  vm.createContext(context); vm.runInContext(filterSource, context);
  context.window.filterStudentCards();
  assert.equal(counter.textContent, '1/2 học sinh');
  assert.equal(cards[0].classList.contains('hidden'), false);
  assert.equal(cards[1].classList.contains('hidden'), true);
  context.window.clearStudentDirectoryFilters();
  assert.equal(input.value, ''); assert.equal(select.value, 'all');
  assert.equal(counter.textContent, '2/2 học sinh'); assert(input.focused);
});

test('moving the menu preserves open/close behavior and mutual exclusion', () => {
  const menu = hidden => {
    const values = new Set(hidden ? ['hidden'] : []);
    return { classList: { add: s => values.add(s), remove: s => values.delete(s), contains: s => values.has(s) } };
  };
  const menus = [menu(true),menu(false)]; let quickClosed = 0;
  const context = { document: { getElementById: id => menus[Number(id.split('-').at(-1))-1], querySelectorAll: () => menus }, closeAllStudentQuickPointsMenus: () => quickClosed++ };
  vm.createContext(context); vm.runInContext(menuSource, context);
  context.toggleStudentMenu({stopPropagation(){}},1);
  assert(!menus[0].classList.contains('hidden'));
  assert(menus[1].classList.contains('hidden'));
  context.toggleStudentMenu({stopPropagation(){}},1);
  assert(menus[0].classList.contains('hidden'));
  assert.equal(quickClosed,2);
});

test('menus can overflow cards and touch targets are not shrunk to match text', () => {
  assert.match(css, /overflow: visible !important/);
  assert.match(css, /student-card-menu\s*\{\s*position: relative/);
  assert.match(css, /student-directory-card:focus-within\s*\{\s*z-index: 40/);
  assert.match(css, /@media \(pointer: coarse\)/);
  assert.match(css, /min-height: 40px/);
  assert.match(harness().markup, /aria-label="Tùy chọn học sinh"/);
});
