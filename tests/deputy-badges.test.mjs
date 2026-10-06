import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {projectDeputyBadges} from '../server/access-model.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const a=html.indexOf('function escapeClassroomRoleText('),b=html.indexOf('function renderClassroomSeat(',a);
const context=vm.createContext({parseTagsList:v=>Array.isArray(v)?v:String(v||'').split(',').map(v=>v.trim()).filter(Boolean),
  escapeHtmlAttr:v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))});
vm.runInContext(html.slice(a,b),context);
test('server-assigned deputy displays its own badge even without a manual role tag',()=>{
  const s={id:1,group:'Tổ 1',role:'Học sinh',deputyRole:{active:true,groupId:'Tổ 1'}};
  const rendered=context.renderClassroomRoleBadge(s);
  assert.match(rendered,/role-group-deputy/);assert.match(rendered,/ph-shield-star/);assert.match(rendered,/>Tổ phó</);
  assert.match(rendered,/classroom-deputy-badges/);
});
test('disabled or transferred deputy cannot retain a stale manual badge',()=>{
  assert.equal(context.renderClassroomRoleBadge({role:'Tổ phó',group:'Tổ 1',deputyRole:null}),'');
  assert.equal(context.renderClassroomRoleBadge({role:'Tổ phó',group:'Tổ 2',deputyRole:{active:true,groupId:'Tổ 1'}}),'');
});
test('deputy badge remains visible alongside a higher-priority class role',()=>{
  const rendered=context.renderClassroomRoleBadge({role:'Lớp trưởng',group:'Tổ 1',deputyRole:{active:true,groupId:'Tổ 1'}});
  assert.match(rendered,/role-class-leader/);assert.equal((rendered.match(/role-group-deputy/g)||[]).length,1);
  assert.match(rendered,/Tổ phó Tổ 1/);
});
test('legacy tags retain their display until migrated; names and group labels are escaped',()=>{
  assert.match(context.renderClassroomRoleBadge({role:'Tổ phó'}),/role-group-deputy/);
  const group='Tổ <script>';
  const rendered=context.renderClassroomRoleBadge({role:'Lớp trưởng',group,deputyRole:{active:true,groupId:group}});
  assert(!rendered.includes('<script>'));assert.match(rendered,/&lt;script&gt;/);
});
test('projection follows active assignment by stable student ID and is idempotent',()=>{
  const state={students:[{id:1,group:'Tổ 1'},{id:2,group:'Tổ 2'}]};
  const accounts=[{kind:'to_pho',studentId:'1',groupId:'Tổ 1',active:true},{kind:'to_pho',studentId:'2',groupId:'Tổ 1',active:true}];
  assert.equal(projectDeputyBadges(state,accounts).changed,true);
  assert.deepEqual(state.students[0].deputyRole,{active:true,groupId:'Tổ 1'});assert.equal(state.students[1].deputyRole,null);
  assert.equal(projectDeputyBadges(state,accounts).changed,false);
  accounts[0].active=false;projectDeputyBadges(state,accounts);assert.equal(state.students[0].deputyRole,null);
});
test('missing roles are safe and legacy role keys render without overriding revoked assignments',()=>{
  assert.equal(context.renderClassroomRoleBadge(null),'');
  assert.equal(context.renderClassroomRoleBadge({}),'');
  for (const role of ['to_pho','vice_leader']) {
    assert.match(context.renderClassroomRoleBadge({role}),/role-group-deputy/);
    assert.equal(context.renderClassroomRoleBadge({role,deputyRole:null}),'');
  }
});
test('failed badge sync can retry successfully without concurrent duplicate requests',async()=>{
  const elements=new Map();
  const create=()=>({children:[],setAttribute(){},replaceChildren(){this.children=[];},appendChild(child){this.children.push(child);if(child.id)elements.set(child.id,child);},remove(){elements.delete(this.id);}});
  const container=create();elements.set('toast-container',container);
  let calls=0,release;
  const c=vm.createContext({currentLoginRole:'gvcn',window:{cloudUser:{uid:'teacher'},cloudServices:{accessAdmin:async()=>{
    calls++;if(calls===1)throw Error('network');await new Promise(r=>{release=r;});
  }}},document:{getElementById:id=>elements.get(id),createElement:create}});
  const start=html.indexOf('async function syncDeputyBadgeState()');
  vm.runInContext(html.slice(start,html.indexOf('function showToast(',start)),c);
  await c.syncDeputyBadgeState();
  const notice=elements.get('deputy-badge-sync-notice');
  assert.equal(notice.children[1].textContent,'Thử lại');
  const retry=notice.children[1].onclick();
  await c.syncDeputyBadgeState();assert.equal(calls,2);
  release();await retry;
  assert.equal(elements.has('deputy-badge-sync-notice'),false);
  assert.equal(c.window.deputyBadgeSyncPending,false);
});
