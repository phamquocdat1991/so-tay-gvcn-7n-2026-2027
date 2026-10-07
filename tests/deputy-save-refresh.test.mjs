import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,tick} from './helpers/deputy-ui.mjs';
import {fixture} from './helpers/deputy-fixture.mjs';

for (const points of [5,-3]) test(`officer saves ${points} points and a new session reads the persisted history`,async()=>{
 const backend=fixture();
 const deputy=body=>backend.service('deputy',body);
 const ui=setup({deputy});await ui.open();
 const form=ui.document.querySelector('#score-form');
 form.querySelector('[name=studentId]').value='2';
 form.querySelector('[name=points]').value=String(points);
 form.querySelector('[name=reason]').value='Kiểm thử lưu điểm';
 form.onsubmit({preventDefault(){},target:form});await tick();
 assert.equal(backend.state().students[1].points,10+points);
 assert.equal(backend.state().students[1].history.length,1);
 const reopened=setup({deputy});await reopened.open();
 assert.match(reopened.document.querySelector('#content').textContent,/Kiểm thử lưu điểm/);
 ui.window.closeDeputyWorkspace();reopened.window.closeDeputyWorkspace();
});

test('confirmed score remains reported saved when subsequent view fails; refresh cannot resubmit it',async()=>{
 const backend=fixture();let failView=false;
 const deputy=async body=>{
   if(body.action==='view'&&failView)throw new Error('Mất kết nối khi tải lại');
   const result=await backend.service('deputy',body);
   if(body.action==='score')failView=true;
   return result;
 };
 const ui=setup({deputy});await ui.open();
 const form=ui.document.querySelector('#score-form');
 form.querySelector('[name=points]').value='-3';
 form.querySelector('[name=reason]').value='Nhận xét đã lưu';
 form.onsubmit({preventDefault(){},target:form});await tick();
 assert.equal(backend.state().students[0].points,7);
 assert.match(ui.document.querySelector('#message').textContent,/Đã lưu điểm/);
 assert.match(ui.document.querySelector('#recovery').textContent,/đã lưu/i);
 assert.doesNotMatch(ui.document.querySelector('#recovery').textContent,/trước khi gửi lần nữa/);
 assert.equal(ui.document.querySelector('#score-form [name=reason]').value,'');
 failView=false;await ui.click('refresh');
 assert.equal(backend.state().students[0].history.length,1);
 assert.match(ui.document.querySelector('#content').textContent,/Nhận xét đã lưu/);
 ui.window.closeDeputyWorkspace();
});

test('score inputs stay disabled until the post-save read completes so a new draft cannot be erased',async()=>{
 const backend=fixture();let reads=0,release;
 const deputy=async body=>{
   if(body.action==='view'&&++reads===2)await new Promise(resolve=>{release=resolve;});
   return backend.service('deputy',body);
 };
 const ui=setup({deputy});await ui.open();
 const form=ui.document.querySelector('#score-form');
 form.querySelector('[name=reason]').value='Bản ghi thứ nhất';
 form.onsubmit({preventDefault(){},target:form});await tick();
 assert.equal(ui.document.querySelector('#score-form [name=reason]').disabled,true);
 release();await tick();
 assert.equal(ui.document.querySelector('#score-form [name=reason]').disabled,false);
 ui.document.querySelector('#score-form [name=reason]').value='Bản nháp tiếp theo';
 await tick();
 assert.equal(ui.document.querySelector('#score-form [name=reason]').value,'Bản nháp tiếp theo');
 ui.window.closeDeputyWorkspace();
});
