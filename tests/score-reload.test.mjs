import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers/deputy-fixture.mjs';
import {setup,tick} from './helpers/deputy-ui.mjs';
function officer() {
 const f=fixture(); f.db.rows.get('artifacts/demo/members/deputy').role='bcs';
 f.state().officerRoles=[{key:'to-truong-1',title:'Tổ trưởng thử',status:'active',assignedStudentId:'1',scope:'group',groupName:'Tổ 1',canAccessTabs:['tich-diem'],allowedCategories:['Học tập'],actions:{view:true,add:true}}];
 return f;
}
test('negative score remains negative even when the reason mentions participation',async()=>{
 const f=officer();await f.service('deputy',{action:'score',studentId:'2',points:-3,category:'Học tập',reason:'Không giơ tay phát biểu',requestId:'negative_participation_123'});
 assert.equal(f.state().students[1].points,7);
});
test('lost save response then workspace reload preserves draft and id; retry commits only once',async()=>{
 const f=officer(); const rows=new Map(); const storage={getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,v),removeItem:k=>rows.delete(k)};
 let lost=true; const ui=setup({deputy:async body=>{const r=await f.service('deputy',body);if(body.action==='score'&&lost){lost=false;throw new Error('Mất phản hồi');}return r;}});
 ui.window.sessionStorage=storage;await ui.open();
 let form=ui.document.querySelector('#score-form'); form.querySelector('[name=studentId]').value='2';form.querySelector('[name=points]').value='-3';form.querySelector('[name=reason]').value='Nội dung thử';
 const id=form.dataset.request;form.onsubmit({preventDefault(){},target:form});await tick();assert.equal(f.state().students[1].points,7);
 await ui.open();form=ui.document.querySelector('#score-form');assert.equal(form.dataset.request,id);assert.equal(form.querySelector('[name=studentId]').value,'2');assert.equal(form.querySelector('[name=points]').value,'-3');assert.equal(form.querySelector('[name=reason]').value,'Nội dung thử');
 form.onsubmit({preventDefault(){},target:form});await tick();assert.equal(f.state().students[1].points,7);assert.equal(f.state().students[1].history.length,1);assert.equal(rows.size,0);
});
test('response without saved confirmation does not erase the draft or announce success',async()=>{
 const f=officer();const ui=setup({deputy:async body=>body.action==='score'?{}:f.service('deputy',body)});await ui.open();const form=ui.document.querySelector('#score-form');form.querySelector('[name=reason]').value='Thử phản hồi lỗi';form.onsubmit({preventDefault(){},target:form});await tick();assert.equal(ui.document.querySelector('#score-form'),form);assert.doesNotMatch(ui.document.querySelector('#message').textContent,/Đã lưu/);assert.equal(ui.document.querySelector('#recovery').hidden,false);
});
test('confirmed write followed by failed read is reported as saved, then refresh permits the next entry',async()=>{
 const f=officer();let reads=0;const ui=setup({deputy:async body=>{if(body.action==='view'&&++reads===2)throw new Error('Tải danh sách thất bại');return f.service('deputy',body);}});
 await ui.open();const form=ui.document.querySelector('#score-form');form.querySelector('[name=studentId]').value='2';form.querySelector('[name=reason]').value='Nội dung thử';form.onsubmit({preventDefault(){},target:form});await tick();assert.equal(f.state().students[1].points,12);assert.match(ui.document.querySelector('#message').textContent,/Máy chủ đã lưu điểm/);
 await ui.click('refresh');assert.equal(ui.document.querySelector('#score-form').querySelector('[name=reason]').value,'');assert.equal(f.state().students[1].points,12);
});
test('successful explicit refresh discards uncertain draft; failed refresh keeps it',async()=>{
 const f=officer();const rows=new Map();const storage={getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,v),removeItem:k=>rows.delete(k)};let failRead=false;
 const ui=setup({deputy:async body=>{if(body.action==='score')throw new Error('Không kết nối');if(failRead)throw new Error('Không đọc được');return f.service('deputy',body);}});ui.window.sessionStorage=storage;
 await ui.open();const form=ui.document.querySelector('#score-form');form.querySelector('[name=reason]').value='Giữ bản nháp';form.onsubmit({preventDefault(){},target:form});await tick();assert.equal(rows.size,1);
 failRead=true;await ui.click('refresh');assert.equal(rows.size,1);assert.equal(ui.document.querySelector('#score-form'),form);
 failRead=false;await ui.click('refresh');assert.equal(rows.size,0);assert.equal(ui.document.querySelector('#score-form').querySelector('[name=reason]').value,'');assert.equal(f.state().students[1].points,10);
});
test('teacher creates officer, sets password, officer signs in and persists plus/minus across a new login',async()=>{
 const f=fixture();f.state().officerRoles=[{key:'to-truong-1',title:'Tổ trưởng thử nghiệm',status:'active',assignedStudentId:'',scope:'group',groupName:'Tổ 1',canAccessTabs:['tich-diem'],allowedCategories:['Học tập'],actions:{view:true,add:true}}];
 await f.access.mutate('teacher',{action:'assign-officer',roleKey:'to-truong-1',studentId:'1',expectedStudentId:''});
 await f.access.mutate('teacher',{action:'set-officer-password',kind:'bcs',studentId:'1',password:'TEST_ONLY_OFFICER_7N'});
 let login=await f.access.login({kind:'bcs',credential:'TEST_ONLY_OFFICER_7N'},'192.0.2.1');
 f.auth.verifyIdToken=async token=>{assert.equal(token,'created-officer');return login.token;};
 let data=await f.service('created-officer',{action:'view'});assert.equal(data.role,'bcs');assert.deepEqual(data.students.map(s=>s.id),['1','2']);
 const base={action:'score',studentId:'2',category:'Học tập'};
 await f.service('created-officer',{...base,points:5,reason:'Hoàn thành bài tập',requestId:'created_officer_plus_123'});
 await f.service('created-officer',{...base,points:-3,reason:'Thiếu bài tập',requestId:'created_officer_minus_123'});
 login=await f.access.login({kind:'bcs',credential:'TEST_ONLY_OFFICER_7N'},'192.0.2.1');data=await f.service('created-officer',{action:'view'});
 assert.equal(data.students.find(s=>s.id==='2').points,12);assert.equal(data.students.find(s=>s.id==='2').history.length,2);
 assert.equal(f.db.rows.get('artifacts/demo/classes/7n/studentViews/2').state.students[0].points,12);
 assert.equal(f.state().students[2].points,20);
});
test('blocked browser storage does not prevent loading or saving scores',async()=>{
 const f=officer();const ui=setup({deputy:body=>f.service('deputy',body)});Object.defineProperty(ui.window,'sessionStorage',{get(){throw new Error('SecurityError');}});
 await ui.open();const form=ui.document.querySelector('#score-form');assert(form);form.querySelector('[name=reason]').value='Thử khi chặn bộ nhớ';form.onsubmit({preventDefault(){},target:form});await tick();assert.equal(f.state().students[0].points,12);assert.match(ui.document.querySelector('#message').textContent,/Đã lưu điểm/);
});
