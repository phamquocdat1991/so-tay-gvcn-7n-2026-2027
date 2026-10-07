import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,tick,blocked,view} from './helpers/deputy-ui.mjs';
test('assignment error has three escape actions and does not expose teacher navigation and automatically retries',async()=>{
 let calls=0;const f=setup({deputy:async()=>{calls++;throw blocked();}});await f.open();
 assert.match(f.document.querySelector('#recovery').textContent,/Đang cập nhật phân công của bạn/);
 for(const action of ['refresh','login','home'])assert(f.document.querySelector(`[data-action="${action}"]`));
 assert.equal(f.document.querySelector('#back'),null);f.poll();await new Promise(r=>setTimeout(r,140));assert.equal(calls,2);
});
test('refresh fetches session before data and exits error state after GVCN corrects assignment',async()=>{
 const order=[];let corrected=false;
 const f=setup({refreshSession:async()=>{order.push('session');return {role:'bcs'};},deputy:async()=>{order.push('view');if(!corrected)throw blocked();return view;}});
 await f.open();corrected=true;order.length=0;await f.click('refresh');
 assert.deepEqual(order,['session','view']);assert.equal(f.document.querySelector('#recovery').hidden,true);
 assert.match(f.document.querySelector('h1').textContent,/Học sinh thử/);
});
test('revoked session refresh shows login action without attempting protected data again',async()=>{
 let calls=0;const f=setup({deputy:async()=>{calls++;throw blocked();},refreshSession:async()=>{throw Object.assign(new Error('Quyền đã thay đổi'),{status:401,code:'SESSION_CHANGED'});}});
 await f.open();await f.click('refresh');assert.equal(calls,1);assert.match(f.document.querySelector('#recovery').textContent,/Cần đăng nhập lại/);
 await f.click('login');assert.equal(f.exits(),1);assert.equal(f.document.querySelector('#deputy-workspace'),null);
});
test('logout remains usable while a view request is hung; late response cannot recreate workspace',async()=>{
 let resolve;const f=setup({deputy:()=>new Promise(r=>resolve=r)});const opening=f.open();
 assert.equal(f.document.querySelector('#logout').disabled,false);
 f.document.querySelector('#logout').click();await tick();assert.equal(f.exits(),1);
 resolve(view);await opening;assert.equal(f.document.querySelector('#deputy-workspace'),null);
});
test('home action signs out instead of re-entering the failed protected workspace',async()=>{
 const f=setup();await f.open();await f.click('home');assert.equal(f.exits(),1);assert.equal(f.document.querySelector('#deputy-workspace'),null);
});
test('dashboard only renders granted function cards and no administrative navigation',async()=>{
 const f=setup({deputy:async()=>({...view,permissions:{roster:true},students:[{id:'1',name:'Học sinh A',group:'Tổ 1',history:[]}]})});await f.open();
 assert(f.document.querySelector('.bcs-hero'));assert(f.document.querySelector('#bcs-avatar'));
 assert.deepEqual([...f.document.querySelectorAll('[data-panel-link]')].map(b=>b.dataset.panelLink),['roster']);
 assert.equal(f.document.querySelector('#score-form'),null);assert.equal(f.document.querySelector('#back'),null);
 assert.equal(f.document.querySelector('[data-panel=roster]').hidden,false);
});
test('dashboard cards navigate between authorized panels without sending mutations',async()=>{
 let requests=0;const f=setup({deputy:async()=>{requests++;return {...view,permissions:{roster:true,scoresView:true},students:[{id:'1',name:'Em A',group:'Tổ 1',points:8,history:[]}]};}});await f.open();
 f.document.querySelector('[data-panel-link=roster]').click();assert.equal(f.document.querySelector('[data-panel=roster]').hidden,false);assert.equal(f.document.querySelector('[data-panel=scores]').hidden,true);assert.equal(requests,1);
});
test('assignment error preserves branded banner and gradient recovery cards without protected data',async()=>{
 const f=setup();await f.open();assert(f.document.querySelector('.bcs-hero'));assert.equal(f.document.querySelectorAll('#recovery .bcs-card').length,3);assert.equal(f.document.querySelector('#content').textContent,'');
});
test('changing active role sends its key and replaces cards instead of merging privileges',async()=>{
 const keys=[];const roles=[{key:'lop-truong',title:'Lớp trưởng',scope:'all'},{key:'to-truong-1',title:'Tổ trưởng Tổ 1',scope:'group',groupName:'Tổ 1'}];
 const f=setup({deputy:async body=>{keys.push(body.roleKey || '');return {...view,selectedRoleKey:body.roleKey || 'lop-truong',availableRoles:roles,permissions:body.roleKey?{roster:true}:{scoresView:true}};}});
 await f.open();const picker=f.document.querySelector('#bcs-role-select');picker.querySelectorAll('option').forEach(o=>o.removeAttribute('selected'));picker.querySelector('[value="to-truong-1"]').setAttribute('selected','');
 picker.dispatchEvent(new f.document.defaultView.Event('change',{bubbles:true}));await tick();
 assert.deepEqual(keys,['','to-truong-1']);assert.equal(f.document.querySelector('[data-panel-link=scores]'),null);assert(f.document.querySelector('[data-panel-link=roster]'));
});

test('live permission signal resumes a waiting student without login',async()=>{
 let assigned=false,logins=0;const f=setup({signOut:async()=>{logins++;},deputy:async()=>{if(!assigned)throw blocked();return view;}});
 await f.open();assigned=true;await f.notify();assert.equal(f.document.querySelector('#recovery').hidden,true);assert.equal(logins,0);
 f.window.closeDeputyWorkspace();await f.notify();assert.equal(f.document.querySelector('#deputy-workspace'),null);
});
test('live permission signal drops a removed role and fetches newly assigned cards',async()=>{
 let changed=false;const keys=[];const f=setup({deputy:async body=>{keys.push(body.roleKey||'');if(changed&&body.roleKey==='old')throw Object.assign(blocked(),{code:'ROLE_UNAVAILABLE'});return {...view,selectedRoleKey:changed?'new':'old',permissions:changed?{roster:true}:{scoresView:true}};}});
 await f.open();changed=true;await f.notify();assert.deepEqual(keys,['','old','']);assert(f.document.querySelector('[data-panel-link=roster]'));assert.equal(f.document.querySelector('[data-panel-link=scores]'),null);
});
test('unrelated permission signal preserves the selected role and unsent form',async()=>{
 const keys=[];const f=setup({deputy:async body=>{keys.push(body.roleKey||'');return {...view,selectedRoleKey:'chosen',permissions:{roster:true}};}});
 await f.open();const content=f.document.querySelector('#content');content.dispatchEvent(new f.document.defaultView.Event('input',{bubbles:true}));const node=content.firstChild;
 await f.notify();assert.deepEqual(keys,['','chosen']);assert.equal(content.firstChild,node);
});

test('direct score form waits for server confirmation and uses no approval controls or tables',async()=>{
 const requests=[];let release;
 const projected={...view,permissions:{points:true,scoresView:true,categories:['Nề nếp']},students:[{id:'1',name:'Bạn A',group:'Tổ 1',points:10,history:[]}]};
 const f=setup({deputy:async body=>{requests.push(body);if(body.action==='score'){await new Promise(r=>release=r);return {saved:true};}return projected;}});
 await f.open();assert.equal(f.document.querySelector('table'),null);assert.equal(f.document.querySelector('[data-action=approve]'),null);assert.equal(f.document.querySelector('[data-panel-link=proposals]'),null);
 assert(f.document.querySelector('.dashboard-card'));assert(f.document.querySelector('.overview-hero-card'));
 const form=f.document.querySelector('#score-form');form.querySelector('[name=reason]').value='Hoàn thành tốt nhiệm vụ';
 form.onsubmit({preventDefault(){},target:form});await tick();assert.equal(requests.at(-1).action,'score');assert.equal(form.querySelector('button[type=submit]').disabled,true);
 assert.doesNotMatch(f.document.querySelector('#message').textContent,/Đã lưu điểm/);
 release();await tick();assert.match(f.document.querySelector('#message').textContent,/Đã lưu điểm trực tiếp/);
});
test('failed direct save keeps form and never reports saved',async()=>{
 const f=setup({deputy:async body=>{if(body.action==='score')throw new Error('Mất kết nối');return {...view,permissions:{points:true,categories:['Nề nếp']},students:[{id:'1',name:'Bạn A',history:[]}]};}});await f.open();
 const form=f.document.querySelector('#score-form');form.querySelector('[name=reason]').value='Nội dung chưa lưu';form.onsubmit({preventDefault(){},target:form});await tick();
 assert.equal(f.document.querySelector('#score-form'),form);assert.match(f.document.querySelector('#recovery').textContent,/Mất kết nối/);assert.doesNotMatch(f.document.querySelector('#message').textContent,/Đã lưu/);
});
test('ambiguous network response keeps request identity through auto-refresh and retry; double submit is ignored',async()=>{
 const requests=[];let release,attempt=0;
 const projected={...view,permissions:{points:true,categories:['Nề nếp']},students:[{id:'1',name:'Bạn A',history:[]}]};
 const f=setup({deputy:async body=>{if(body.action==='score'){requests.push(body);attempt++;if(attempt===1){await new Promise(r=>release=r);throw new Error('Mất phản hồi sau khi lưu');}return {saved:true};}return projected;}});
 await f.open();const form=f.document.querySelector('#score-form');form.querySelector('[name=reason]').value='Nhận xét';
 const submit=()=>form.onsubmit({preventDefault(){},target:form});submit();submit();await tick();assert.equal(requests.length,1);assert.equal(form.querySelector('[name=reason]').disabled,true);
 release();await tick();assert.equal(form.querySelector('[name=reason]').disabled,false);
 await f.notify();f.poll();await tick();assert.equal(f.document.querySelector('#score-form'),form);
 submit();await tick();assert.equal(requests.length,2);assert.equal(requests[0].requestId,requests[1].requestId);assert.deepEqual(requests[0],requests[1]);
});
