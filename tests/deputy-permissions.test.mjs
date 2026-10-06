import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../deputy-permissions.js',import.meta.url),'utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(role='gvcn') {
  const calls=[],dialogs=[],message={textContent:'',style:{}};
  const rows=[{id:'1',name:'Học sinh <Một>',group:'Tổ 1',deputyAccess:'active'},
    {id:'2',name:'Học sinh Hai',group:'Tổ 1',deputyAccess:'missing'}];
  const host={innerHTML:'',isConnected:true,querySelector:()=>message,querySelectorAll:()=>[]};
  const document={getElementById:id=>id==='deputy-permissions'?host:null,
    body:{appendChild:node=>dialogs.push(node)},createElement:()=>{
      const form={},cancel={},input={value:'',focus(){}},confirmation={value:''};
      return {innerHTML:'',style:{},form,cancel,input,confirmation,setAttribute(){},showModal(){this.open=true;},close(){this.open=false;},remove(){this.removed=true;},
        addEventListener(name,handler){this['on'+name]=handler;},querySelectorAll:()=>[input,confirmation],
        querySelector:selector=>selector==='form'?form:selector==='input'?input:selector==='[data-deputy-close]'?cancel:message};
    }};
  const context={window:{cloudMembership:{role},cloudServices:{accessAdmin:async body=>{
    calls.push(body);
    if(body.action!=='list') {
      const s=rows.find(s=>s.id===body.studentId);
      s.deputyAccess=body.action==='toggle'&&!body.active?'blocked':'active';
      if(body.replaceGroupDeputy) rows.filter(r=>r.id!==s.id&&r.group===s.group&&r.deputyAccess==='active').forEach(r=>r.deputyAccess='blocked');
    }
    return {features:{compactDeputyAssignment:true},students:structuredClone(rows)};
  }}},document,confirm:()=>true,FormData:class {constructor(form){this.values=form.values;}get(key){return this.values[key];}}};
  vm.createContext(context);vm.runInContext(source,context);
  function click(attribute,id='1') {
    const row={dataset:{deputyRow:'Tổ 1'},querySelector:()=>({value:id})};
    const button={hasAttribute:name=>name===attribute,closest:()=>row};
    host.onclick({target:{closest:()=>button}});
  }
  return {context,host,calls,dialogs,click,message,rows};
}
test('compact deputy rows show selectors, status and sliders without inline password forms',async()=>{
  const f=fixture();await f.context.window.loadDeputyPermissions();
  assert.equal((f.host.innerHTML.match(/data-deputy-row=/g)||[]).length,4);
  assert.equal((f.host.innerHTML.match(/ph-user-circle/g)||[]).length,4);
  assert.equal((f.host.innerHTML.match(/ph-sliders/g)||[]).length,4);
  assert.match(f.host.innerHTML,/Đang Bật/);assert.match(f.host.innerHTML,/Học sinh &lt;Một&gt;/);
  assert(!f.host.innerHTML.includes('type="password"'));assert(!f.host.innerHTML.includes('<form'));
  assert.equal(f.dialogs.length,0);
});
test('settings opens a modal; cancel clears secrets without assigning or changing access',async()=>{
  const f=fixture();await f.context.window.loadDeputyPermissions();f.click('data-deputy-settings');
  const dialog=f.dialogs[0];assert.equal(dialog.open,true);assert.match(dialog.innerHTML,/type="password"/);
  dialog.input.value='secret';dialog.cancel.onclick();
  assert.equal(dialog.input.value,'');assert.equal(dialog.removed,true);
  assert.equal(f.calls.filter(c=>c.action!=='list').length,0);
});
test('toggle persists actual access state and refreshes the compact row',async()=>{
  const f=fixture();await f.context.window.loadDeputyPermissions();f.click('data-deputy-toggle');await settle();
  const mutation=f.calls.find(c=>c.action==='toggle');
  assert.equal(mutation.kind,'to_pho');assert.equal(mutation.studentId,'1');assert.equal(mutation.active,false);
  assert.match(f.host.innerHTML,/Đã Tắt/);
});
test('password is saved only from settings after matching confirmation',async()=>{
  const f=fixture();await f.context.window.loadDeputyPermissions();f.click('data-deputy-settings','2');
  const dialog=f.dialogs[0],form=dialog.form;
  form.values={password:'new-password',confirmation:'mismatch'};
  form.onsubmit({preventDefault(){},target:form});assert.equal(f.calls.filter(c=>c.action!=='list').length,0);
  form.values.confirmation='new-password';form.onsubmit({preventDefault(){},target:form});await settle();
  const mutation=f.calls.find(c=>c.action==='set-officer-password');
  assert.equal(mutation.studentId,'2');assert.equal(mutation.replaceGroupDeputy,true);assert.equal(mutation.expectedGroup,'Tổ 1');
  assert.equal(dialog.removed,true);assert.equal(f.rows[0].deputyAccess,'blocked');assert.equal(f.rows[1].deputyAccess,'active');
});
test('a deputy cannot load the teacher assignment controls',async()=>{
  const f=fixture('to_pho');await f.context.window.loadDeputyPermissions();assert.equal(f.calls.length,0);assert.equal(f.host.innerHTML,'');
});
test('retry reloads a failed list without replaying writes; duplicate mounts do not fetch again',async()=>{
  const f=fixture();const api=f.context.window.cloudServices.accessAdmin;
  let attempts=0;
  f.context.window.cloudServices.accessAdmin=async body=>{
    attempts++;
    if(attempts===1) throw new Error('Failed to fetch');
    return api(body);
  };
  await f.context.window.loadDeputyPermissions();
  assert.match(f.message.textContent,/Kiểm tra mạng/);
  assert.equal((f.host.innerHTML.match(/data-deputy-row=/g)||[]).length,4);
  assert.match(f.host.innerHTML,/Thử lại/);
  await f.context.window.loadDeputyPermissions();assert.equal(attempts,1);
  f.click('data-deputy-refresh');await settle();
  assert.equal(attempts,2);assert.match(f.host.innerHTML,/Tổ phó Tổ 4/);
  assert(f.calls.every(c=>c.action==='list'));
});
test('four inline cards appear while the API is pending, with no portal navigation required',async()=>{
  const f=fixture();let resolve;
  f.context.window.cloudServices.accessAdmin=()=>new Promise(r=>{resolve=r;});
  const pending=f.context.window.loadDeputyPermissions();
  assert.equal((f.host.innerHTML.match(/data-deputy-row=/g)||[]).length,4);
  assert.match(f.host.innerHTML,/permission-role-card/);
  assert.match(f.host.innerHTML,/Chưa tải/);
  assert.doesNotMatch(f.host.innerHTML,/to-pho\.html|location\.|Đăng nhập Tổ/);
  resolve({features:{compactDeputyAssignment:true},students:f.rows});await pending;
  assert.match(f.host.innerHTML,/Đang Bật/);
});
