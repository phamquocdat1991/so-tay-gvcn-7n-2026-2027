import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers/deputy-fixture.mjs';
import {setup,tick} from './helpers/deputy-ui.mjs';
function journey() {
 const backend=fixture();backend.db.rows.get('artifacts/demo/members/deputy').role='bcs';
 backend.state().officerRoles=[{key:'to-truong-1',title:'Tổ trưởng Tổ 1',status:'active',assignedStudentId:'1',scope:'group',groupName:'Tổ 1',canAccessTabs:['hoc-sinh','tich-diem','diem-danh','bao-cao','truc-nhat'],allowedCategories:['Nề nếp','Học tập','Chuyên cần'],actions:{view:true,add:true,edit:true}}];
 const requests=[];
 const ui=setup({deputy:async body=>{requests.push(body);return backend.service('deputy',body);}});
 const fill=(form,name,value)=>{const field=form.querySelector(`[name=${name}]`);field.value=value;field.dispatchEvent(new ui.document.defaultView.Event('input',{bubbles:true}));};
 const submit=async form=>{form.onsubmit({preventDefault(){},target:form});await tick();};
 return {...ui,backend,requests,fill,submit};
}
test('student journey: navigate, select pupil, add score, edit own record, cancel edit and add next score',async()=>{
 const f=journey();await f.open();assert.equal(f.document.querySelector('table'),null);
 for(const b of f.document.querySelectorAll('[data-panel-link]')){b.click();assert.equal(f.document.querySelector(`[data-panel=${b.dataset.panelLink}]`).hidden,false);}
 f.document.querySelector('[data-panel-link=points]').click();
 let form=f.document.querySelector('#score-form');f.fill(form,'studentId','2');f.fill(form,'points','3');f.fill(form,'reason','Thực hiện tốt nhiệm vụ');await f.submit(form);
 assert.equal(f.backend.state().students[1].points,13);assert.match(f.document.querySelector('#message').textContent,/Đã lưu điểm/);
 await f.click('edit-score');form=f.document.querySelector('#score-form');assert.equal(form.querySelector('[name=studentId]').value,'2');assert.equal(form.querySelector('[name=studentId]').disabled,true);
 f.fill(form,'points','5');await f.submit(form);assert.equal(f.backend.state().students[1].points,15);assert.equal(f.backend.state().students[1].history.length,1);
 await f.click('edit-score');await f.click('cancel-edit');form=f.document.querySelector('#score-form');assert.equal(form.querySelector('[name=studentId]').disabled,false);
 f.fill(form,'studentId','1');f.fill(form,'points','2');f.fill(form,'reason','Hoàn thành bài tập');await f.submit(form);assert.equal(f.backend.state().students[0].points,12);
 assert.equal(f.backend.state().students[2].points,20);
});
test('opening an edit form stays on the selected record during background polling',async()=>{
 const f=journey();await f.open();let form=f.document.querySelector('#score-form');f.fill(form,'studentId','2');f.fill(form,'reason','Nề nếp tốt');await f.submit(form);
 await f.click('edit-score');form=f.document.querySelector('#score-form');const request=form.dataset.request;
 f.poll();await tick();assert(f.document.querySelector('#score-form')===form,'background refresh replaced the active edit form');assert.equal(form.dataset.request,request);assert(form.dataset.historyId);
});
test('student journey: attendance and duty submit selected values while controls are locked',async()=>{
 const f=journey();await f.open();let form=f.document.querySelector('.attendance-form[data-id="2"]');f.fill(form,'status','late');await f.submit(form);
 assert.equal(f.backend.state().attendanceRecords['2026-09-14']['2'],'late');
 form=f.document.querySelector('.duty-form[data-id="2"]');f.fill(form,'rating','good');f.fill(form,'reason','Đã quét sạch lớp');await f.submit(form);
 assert.equal(f.backend.state().dutyRoster.weeks['2026-09-14'].deputyEvaluations.mon.morning['2'].rating,'good');assert.match(f.document.querySelector('#message').textContent,/Đã lưu đánh giá/);
});
test('student journey: saved response lost, retry from preserved form does not score twice',async()=>{
 const f=journey();const normal=f.window.cloudServices.deputy;let lost=false;
 f.window.cloudServices.deputy=async body=>{const result=await normal(body);if(body.action==='score'&&!lost){lost=true;throw new Error('Mất phản hồi máy chủ');}return result;};
 await f.open();const form=f.document.querySelector('#score-form');f.fill(form,'studentId','2');f.fill(form,'points','4');f.fill(form,'reason','Hoàn thành nhiệm vụ');await f.submit(form);
 assert.equal(f.backend.state().students[1].points,14);assert.equal(f.document.querySelector('#recovery').hidden,false);
 await f.notify();assert(f.document.querySelector('#score-form')===form);await f.submit(form);
 assert.equal(f.backend.state().students[1].points,14);assert.equal(f.backend.state().students[1].history.length,1);assert.match(f.document.querySelector('#message').textContent,/Đã lưu điểm/);
});
test('student journey: invalid score can be corrected without losing the selected pupil or reason',async()=>{
 const f=journey();await f.open();const form=f.document.querySelector('#score-form');f.fill(form,'studentId','2');f.fill(form,'points','0');f.fill(form,'reason','Nội dung cần giữ');await f.submit(form);
 assert.equal(f.backend.state().students[1].points,10);assert(f.document.querySelector('#score-form')===form);assert.match(f.document.querySelector('#recovery').textContent,/khác 0/);
 f.fill(form,'points','2');await f.submit(form);assert.equal(f.backend.state().students[1].points,12);assert.equal(f.backend.state().students[1].history[0].reason,'Nội dung cần giữ');
});
test('student journey: removal of role while entering clears protected content and blocks the old form',async()=>{
 const f=journey();await f.open();const form=f.document.querySelector('#score-form');f.fill(form,'studentId','2');f.fill(form,'reason','Đang nhập');
 f.backend.state().officerRoles[0].assignedStudentId='2';await f.notify();assert.equal(f.document.querySelector('#score-form'),null);assert.equal(f.document.querySelector('#content').textContent,'');
 await f.submit(form);assert.equal(f.backend.state().students[1].points,10);
});
