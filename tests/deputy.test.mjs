import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeputyService } from '../server/deputy-service.mjs';
import { createAccessService } from '../server/access-service.mjs';
import { managedUid } from '../server/access-model.mjs';
import { makeHandler } from '../server/access-http.mjs';

import {fixture} from './helpers/deputy-fixture.mjs';
const BASE = 'artifacts/demo', CLASS = `${BASE}/classes/7n`, STATE = `${CLASS}/state/main`;
const requestId = 'request_1234567890';
const propose = {action:'propose',requestId,studentId:'2',points:-3,reason:'Vi phạm nề nếp'};
const duty = {action:'duty',studentId:'2',week:'2026-09-14',day:'mon',shift:'morning',rating:'incomplete',reason:'Chưa lau bảng'};
test('group projection excludes other students, private fields and other-group proposals',async () => {
  const f=fixture(); f.db.rows.set(`${CLASS}/scoreProposals/other`,{groupId:'Tổ 2',reason:'private'});
  const view=await f.service('deputy',{action:'view',groupId:'Tổ 2'});
  assert.deepEqual(view.students.map(s=>s.id),['1','2']); assert.equal(view.proposals,undefined);
  assert.deepEqual(view.duties.map(d=>d.studentId),['1','2']); assert(!JSON.stringify(view).includes('private'));
});
test('cross-group duty, proposals, approval, delete, reset and assignment are denied without writes',async () => {
  const f=fixture(); const before=structuredClone([...f.db.rows]);
  for(const input of [{...propose,studentId:'3'},{...duty,studentId:'3'},{action:'approve',requestId},{action:'delete'},{action:'reset'},{action:'assign'}]) await assert.rejects(f.service('deputy',input),e=>e.status===403);
  assert.deepEqual([...f.db.rows],before);
});
test('inactive, stale, wrong-class and moved-group memberships fail closed',async () => {
  for(const change of [{active:false},{accessVersion:2},{classId:'8n'},{groupId:'Tổ 2'},{role:'bcs'}]) {
    const f=fixture();Object.assign(f.db.rows.get(`${BASE}/members/deputy`),change);
    await assert.rejects(f.service('deputy',{action:'view'}),e=>e.status===403);
  }
  await assert.rejects(fixture().service('invalid',{action:'view'}),e=>e.status===401);
});
test('direct scoring commits immediately and duplicate submission cannot double count',async () => {
  const f=fixture(); await Promise.all([f.service('deputy',propose),f.service('deputy',propose)]);
  await assert.rejects(f.service('teacher',{action:'approve',requestId}),e=>e.status===403);
  assert.equal(f.state().students[1].points,7); assert.equal(f.state().students[1].history.length,1);
  assert.equal(f.db.rows.get(STATE).scoreRevision,1);
  assert.equal(f.db.rows.get(`${CLASS}/studentViews/2`).state.students[0].points,7);
});
test('participation is directly scored +2 and approval/rejection endpoints are disabled',async () => {
 const f=fixture();await f.service('deputy',{...propose,reason:'Giơ tay phát biểu',points:15});
 assert.equal(f.state().students[1].points,12);
 for(const action of ['approve','reject']) await assert.rejects(f.service('teacher',{action,requestId}),e=>e.status===403);
 assert(![...f.db.rows.keys()].some(k=>k.includes('/scoreProposals/')));
});
test('duty edits reverse previous delta, persist reason and never touch the other group',async () => {
  const f=fixture();await f.service('deputy',duty);await f.service('deputy',duty);
  assert.equal(f.state().students[1].points,7);
  await f.service('deputy',{...duty,rating:'good',reason:'Đã lau sạch'});
  const s=f.state().students[1];assert.equal(s.points,15);assert.equal(s.stars,15);assert.equal(s.history.length,1);
  assert.equal(f.state().students[2].points,20);
  assert.equal(f.state().dutyRoster.weeks[duty.week].deputyEvaluations.mon.morning['2'].reason,'Đã lau sạch');
});
test('unassigned, future, closed and teacher-rated duties are rejected',async () => {
  const f=fixture();
  for(const change of [{shift:'afternoon'},{day:'tue'},{week:'2026-09-07'},{rating:'bogus'}]) await assert.rejects(f.service('deputy',{...duty,...change}),e=>e.status===403);
  f.state().dutyRoster.weeks[duty.week].evaluations={mon:{morning:{status:'good'}}};
  await assert.rejects(f.service('deputy',duty),e=>e.status===403);
  delete f.state().dutyRoster.weeks[duty.week].evaluations.mon;
  f.state().weeklyCompetitionArchives={[duty.week]:{}};
  await assert.rejects(f.service('deputy',duty),e=>e.status===403);
});
test('closed week rejects direct score without writing',async () => {
 const f=fixture();f.state().weeklyCompetition.start='2026-09-21';const before=structuredClone([...f.db.rows]);
 await assert.rejects(f.service('deputy',propose),e=>e.status===403);assert.deepEqual([...f.db.rows],before);
});
test('disabled score linking records duty with zero score',async () => {
  const f=fixture();f.state().dutyRoster.settings.linkPoints=false;await f.service('deputy',duty);
  assert.equal(f.state().students[1].points,10);assert.equal(f.state().students[1].history[0].points,0);
});
test('provisioning deputy binds roster group, revokes BCS and prevents regranting broad role',async () => {
  const f=fixture();await f.access.mutate('teacher',{action:'password',kind:'bcs',studentId:'1',password:'officer-password'});
  await f.access.mutate('teacher',{action:'password',kind:'to_pho',studentId:'1',password:'deputy-password',groupId:'Tổ 2'});
  const uid=managedUid('demo','7n','to_pho','1');
  assert.equal(f.db.rows.get(`${BASE}/members/${uid}`).groupId,'Tổ 1');
  assert.equal(f.db.rows.get(`${BASE}/members/${managedUid('demo','7n','bcs','1')}`).active,false);
  await assert.rejects(f.access.mutate('teacher',{action:'password',kind:'bcs',studentId:'1',password:'another-password'}),e=>e.status===409);
  const result=await f.access.login({kind:'to_pho',credential:'deputy-password'},'192.0.2.1');assert.equal(result.token.uid,uid);
  f.state().students[0].group='Tổ 2';
  await assert.rejects(f.access.login({kind:'to_pho',credential:'deputy-password'},'192.0.2.1'),e=>e.status===401);
});
test('HTTP deputy endpoint authenticates token, rejects cross-origin and routes through scoped service',async () => {
  const f=fixture();const handler=makeHandler('deputy',async()=>({deputy:f.service}));
  const req=(token,origin='https://class.example')=>new Request('https://class.example/.netlify/functions/deputy',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`,origin},body:JSON.stringify({action:'view'})});
  assert.equal((await handler(req('deputy'))).status,200);
  assert.equal((await handler(req('bad'))).status,401);
  assert.equal((await handler(req('deputy','https://evil.example'))).status,403);
});
test('deputy signs in through the shared BCS option and retains its scoped membership', async () => {
  const f=fixture();
  await f.access.mutate('teacher',{action:'password',kind:'to_pho',studentId:'1',password:'shared-login-deputy'});
  const result=await f.access.login({kind:'bcs',credential:'shared-login-deputy'},'192.0.2.1');
  const uid=managedUid('demo','7n','to_pho','1');
  assert.equal(result.token.uid,uid);
  assert.equal(f.db.rows.get(`${BASE}/members/${uid}`).role,'to_pho');
  assert.equal(f.db.rows.get(`${BASE}/members/${uid}`).groupId,'Tổ 1');
  await f.access.mutate('teacher',{action:'toggle',kind:'to_pho',studentId:'1',active:false});
  await assert.rejects(f.access.login({kind:'bcs',credential:'shared-login-deputy'},'192.0.2.1'),e=>e.status===401);
});
test('shared BCS login prevents password collisions between officers and deputies', async () => {
  const f=fixture();
  await f.access.mutate('teacher',{action:'password',kind:'bcs',studentId:'1',password:'officer-shared-secret'});
  await assert.rejects(f.access.mutate('teacher',{action:'password',kind:'to_pho',studentId:'2',password:'officer-shared-secret'}),e=>e.status===409);
  await f.access.mutate('teacher',{action:'password',kind:'to_pho',studentId:'2',password:'deputy-shared-secret'});
  await assert.rejects(f.access.mutate('teacher',{action:'password',kind:'bcs',studentId:'1',password:'deputy-shared-secret'}),e=>e.status===409);
  assert.equal((await f.access.login({kind:'bcs',credential:'officer-shared-secret'},'192.0.2.1')).token.uid,managedUid('demo','7n','bcs','1'));
});
test('compact assignment replaces only the previous deputy in the selected group atomically', async () => {
  const f=fixture();
  for (const id of ['1','3']) await f.access.mutate('teacher',{action:'password',kind:'to_pho',studentId:id,password:`password-student-${id}`});
  await f.access.mutate('teacher',{action:'password',kind:'to_pho',studentId:'2',password:'password-student-2',replaceGroupDeputy:true,expectedGroup:'Tổ 1'});
  const member=id=>f.db.rows.get(`${BASE}/members/${managedUid('demo','7n','to_pho',id)}`);
  assert.equal(member('1').active,false); assert.equal(member('2').active,true); assert.equal(member('3').active,true);
  await assert.rejects(f.access.login({kind:'bcs',credential:'password-student-1'},'192.0.2.1'),e=>e.status===401);
  assert.equal((await f.access.login({kind:'bcs',credential:'password-student-2'},'192.0.2.1')).token.uid,managedUid('demo','7n','to_pho','2'));
  await f.access.mutate('teacher',{action:'toggle',kind:'to_pho',studentId:'1',active:true,replaceGroupDeputy:true,expectedGroup:'Tổ 1'});
  assert.equal(member('1').active,true);assert.equal(member('2').active,false);assert.equal(member('3').active,true);
});
test('a changed group or invalid password cannot revoke the previous deputy', async () => {
  const f=fixture();
  await f.access.mutate('teacher',{action:'password',kind:'to_pho',studentId:'1',password:'old-deputy-password'});
  const before=structuredClone([...f.db.rows]);
  await assert.rejects(f.access.mutate('teacher',{action:'password',kind:'to_pho',studentId:'2',password:'new-deputy-password',replaceGroupDeputy:true,expectedGroup:'Tổ 2'}),e=>e.status===409);
  await assert.rejects(f.access.mutate('teacher',{action:'password',kind:'to_pho',studentId:'2',password:'bad',replaceGroupDeputy:true,expectedGroup:'Tổ 1'}),e=>e.status===400);
  assert.deepEqual([...f.db.rows],before);
});
test('account assignment stores roster linkage without changing student scores',async()=>{
  const f=fixture();const before=structuredClone(f.state());
  await f.access.mutate('teacher',{action:'password',kind:'to_pho',studentId:'1',password:'account-password-one'});
  assert.deepEqual(f.state().students,before.students);
  assert.deepEqual(f.state().deputyAssignments,[{studentId:'1',groupId:'Tổ 1',role:'to_pho',active:true}]);
  await assert.rejects(f.access.mutate('teacher',{action:'sync-deputy-badges'}),e=>e.status===400);
});
function asOfficer(f,scope='group') {
  f.db.rows.get(`${BASE}/members/deputy`).role='bcs';
  f.state().officerRoles=[{key:scope==='group'?'to-truong-1':'lop-truong',title:'Cán bộ',status:'active',assignedStudentId:'1',scope,groupName:scope==='group'?'Tổ 1':'',canAccessTabs:['tich-diem','truc-nhat','diem-danh','bao-cao'],allowedCategories:['Nề nếp','Chuyên cần','Học tập'],actions:{view:true,add:true}}];
}
test('group leader API projects only assigned group and rejects cross-group scoring, duty and attendance',async()=>{
  const f=fixture();asOfficer(f);
  const view=await f.service('deputy',{action:'view',groupId:'Tổ 2'});
  assert.deepEqual(view.students.map(s=>s.id),['1','2']);
  for(const request of [{...propose,studentId:'3'},{...duty,studentId:'3'},{action:'attendance',studentId:'3',status:'late'}]) await assert.rejects(f.service('deputy',request),e=>e.status===403);
  await f.service('deputy',propose);assert.equal(f.state().students[1].points,7);
});
test('class officers score across class only in teacher-authorized categories, without duplicate awards',async()=>{
  const f=fixture();asOfficer(f,'all');
  assert.equal((await f.service('deputy',{action:'view'})).students.length,3);
  await f.service('deputy',{...propose,studentId:'3'});await f.service('deputy',{...propose,studentId:'3'});
  assert.equal(f.state().students[2].points,17);
  await assert.rejects(f.service('deputy',{...propose,requestId:'different_request_123',category:'Kỷ luật'}),e=>e.status===403);
});
test('live revocation, tab removal, add permission and changed group are enforced on every API request',async()=>{
  const f=fixture();asOfficer(f);
  const role=f.state().officerRoles[0];role.actions.add=false;
  await assert.rejects(f.service('deputy',duty),e=>e.status===403);
  role.actions.add=true;role.canAccessTabs=[];
  await assert.rejects(f.service('deputy',propose),e=>e.status===403);
  role.status='inactive';await assert.rejects(f.service('deputy',{action:'view'}),e=>e.status===403);
  role.status='active';f.state().students[0].group='Tổ 2';
  await assert.rejects(f.service('deputy',{action:'view'}),e=>e.status===403);
});
test('attendance uses configured penalty, retries do not double deduct and correction restores ledger',async()=>{
  const f=fixture();asOfficer(f,'all');f.state().criteria={negative:[{reason:'Đi học muộn',points:4}]};
  const request={action:'attendance',studentId:'2',status:'late'};
  await f.service('deputy',request);await f.service('deputy',request);
  assert.equal(f.state().students[1].points,6);
  assert.equal(f.state().attendancePointAdjustments['2026-09-14']['2'].pointsDelta,-4);
  await f.service('deputy',{...request,status:'present'});assert.equal(f.state().students[1].points,10);
  f.state().weeklyCompetitionArchives={'2026-09-14':{}};
  await assert.rejects(f.service('deputy',request),e=>e.status===403);
});

test('group leader key cannot be widened to all-class scope by a scope field',async()=>{
  const f=fixture();asOfficer(f);f.state().officerRoles[0].scope='all';
  const result=await f.service('deputy',{action:'view'});
  assert.deepEqual(result.students.map(s=>s.id),['1','2']);
  await assert.rejects(f.service('deputy',{...propose,studentId:'3'}),e=>e.status===403);
});

test('teacher account list links deputy role and credential kind, including existing assignments',async()=>{
 const f=fixture();await f.access.mutate('teacher',{action:'password',kind:'to_pho',studentId:'1',password:'deputy-linked-password'});
 delete f.state().deputyAssignments;
 let list=await f.access.list('teacher');let row=list.students.find(s=>s.id==='1');
 assert.equal(row.officerKind,'to_pho');assert.equal(row.officer,'Tổ phó Tổ 1');assert.equal(row.officerAccess,'active');
 assert.equal(f.state().deputyAssignments[0].studentId,'1');
 await f.access.mutate('teacher',{action:'toggle',kind:'to_pho',studentId:'1',active:false});
 list=await f.access.list('teacher');row=list.students.find(s=>s.id==='1');
 assert.equal(row.officerKind,'to_pho');assert.equal(row.officerAccess,'blocked');assert.deepEqual(f.state().deputyAssignments,[]);
});

function gradeFixture(scope='group') {
  const f=fixture();asOfficer(f,scope);
  f.state().subjectsConfig=[{id:'math',name:'Toán'}];
  f.state().officerRoles[0].actions.gradeEntry=true;
  return f;
}
const grade={action:'grade',requestId:'grade_request_123456',studentId:'2',subjectId:'math',semester:'HK1',sequence:1,score:'8',expectedRecord:null};
test('officer grade commits academic record, points and student view atomically; retry never doubles points',async()=>{
 const f=gradeFixture();await Promise.all([f.service('deputy',grade),f.service('deputy',grade)]);
 assert.equal(f.state().academicScoresRecords.length,1);
 assert.equal(f.state().students[1].points,18);
 assert.equal(f.db.rows.get(STATE).scoreRevision,1);
 assert.equal(f.db.rows.get(`${CLASS}/studentViews/2`).state.academicScoresRecords[0].score,8);
 const view=await f.service('deputy',{action:'view'});
 assert.equal(view.grades[0].studentId,'2');assert(view.grades[0].version);
});
test('same-cell stale edit fails; fresh edit and delete reconcile reward deltas',async()=>{
 const f=gradeFixture();await f.service('deputy',grade);
 const edit={...grade,requestId:'grade_request_edit_123',score:'9'};
 await assert.rejects(f.service('deputy',edit),e=>e.status===409);
 assert.equal(f.state().students[1].points,18);
 let view=await f.service('deputy',{action:'view'});
 await f.service('deputy',{...edit,expectedRecord:view.grades[0].version});
 assert.equal(f.state().students[1].points,19);
 view=await f.service('deputy',{action:'view'});
 await f.service('deputy',{...grade,requestId:'grade_request_delete_123',score:'',expectedRecord:view.grades[0].version});
 assert.equal(f.state().students[1].points,10);assert.equal(f.state().academicScoresRecords.length,0);
});
test('grade rejects out-of-scope, invalid, revoked and closed-week writes without mutation',async()=>{
 for(const input of [{...grade,studentId:'3'},{...grade,score:'oops'},{...grade,score:11},{...grade,subjectId:'fake'}]) {
   const f=gradeFixture();const before=structuredClone([...f.db.rows]);
   await assert.rejects(f.service('deputy',input));assert.deepEqual([...f.db.rows],before);
 }
 for(const revoke of [f=>f.state().officerRoles[0].actions.gradeEntry=false,f=>f.state().gradeSettings={allowOfficerGradeEntry:false},f=>f.state().weeklyCompetitionArchives={'2026-09-14':{}}]) {
   const f=gradeFixture();revoke(f);await assert.rejects(f.service('deputy',grade),e=>e.status===403);
 }
});
test('different students entered concurrently retain both scores and revisions',async()=>{
 const f=gradeFixture();await Promise.all([f.service('deputy',grade),f.service('deputy',{...grade,studentId:'1',requestId:'grade_other_student_123'})]);
 assert.equal(f.state().students[0].points,18);assert.equal(f.state().students[1].points,18);assert.equal(f.db.rows.get(STATE).scoreRevision,2);
});
test('settled grade edit does not reapply points into the new cycle',async()=>{
 const f=gradeFixture();await f.service('deputy',grade);f.state().academicScoresRecords[0].weeklyResetSettled=true;f.state().students[1].points=0;
 const view=await f.service('deputy',{action:'view'});
 await f.service('deputy',{...grade,score:'10',requestId:'grade_settled_edit_123',expectedRecord:view.grades[0].version});
 assert.equal(f.state().students[1].points,0);assert.equal(f.state().academicScoresRecords[0].score,10);
});

function laborFixture() {
 const f=fixture();asOfficer(f,'all');
 Object.assign(f.state().officerRoles[0],{key:'lop-pho-lao-dong',title:'Lớp phó lao động'});
 f.state().students[0].role='Lớp phó lao động';
 return f;
}
const assignLabor={action:'assign-officer',roleKey:'lop-pho-lao-dong',studentId:'2',expectedStudentId:'1'};
test('changing labor deputy atomically removes old assignment and removes old rights without transferring the credential',async()=>{
 const f=laborFixture();await f.access.mutate('teacher',{action:'password',kind:'bcs',studentId:'1',password:'labor-first-secret'});
 const oldUid=managedUid('demo','7n','bcs','1');
 const result=await f.access.mutate('teacher',assignLabor);
 assert.equal(result.studentName,'Bạn Hai');assert.equal(f.state().officerRoles[0].assignedStudentId,'2');
 assert.equal(f.state().students[0].role,'Học sinh');assert.equal(f.state().students[1].role,'Lớp phó lao động');
 assert.equal(f.db.rows.get(`${BASE}/members/${oldUid}`).active,true);
 assert(!f.db.rows.has(`${BASE}/_accessAccounts/${managedUid('demo','7n','bcs','2')}`));
 await assert.rejects(f.access.login({kind:'bcs',credential:'labor-first-secret'},'192.0.2.1'),e=>e.status===401);
 await assert.rejects(f.service('deputy',{action:'view'}),e=>e.status===403);
 assert.equal(f.db.rows.get(STATE).scoreRevision,1);
});
test('labor assignment rejects stale selection and nonexistent student without partial changes',async()=>{
 for (const changes of [{expectedStudentId:'3'},{studentId:'999'}]) {
  const f=laborFixture(),before=structuredClone([...f.db.rows]);
  await assert.rejects(f.access.mutate('teacher',{...assignLabor,...changes}));
  assert.deepEqual([...f.db.rows],before);
 }
});
test('former labor deputy keeps only another assigned role, without invalidating the authenticated session',async()=>{
 const f=laborFixture();f.state().officerRoles.push({...f.state().officerRoles[0],key:'lop-truong',title:'Lớp trưởng'});
 await f.access.mutate('teacher',{action:'password',kind:'bcs',studentId:'1',password:'labor-multiple-secret'});
 const uid=managedUid('demo','7n','bcs','1'),before=f.db.rows.get(`${BASE}/members/${uid}`).accessVersion;
 await f.access.mutate('teacher',assignLabor);
 const member=f.db.rows.get(`${BASE}/members/${uid}`);assert.equal(member.active,true);assert.equal(member.accessVersion,before);assert.equal(member.permissionRevision,1);
 assert.equal(f.state().officerRoles.find(r=>r.key==='lop-truong').assignedStudentId,'1');
});
test('officer identity and new history use roster name even if membership contains another name',async()=>{
 const f=laborFixture();f.db.rows.get(`${BASE}/members/deputy`).displayName='Tên bị lưu sai';
 const view=await f.service('deputy',{action:'view'});
 assert.equal(view.identity.name,'Tổ phó Một');assert.equal(view.identity.title,'Lớp phó lao động');assert.equal(view.identity.studentId,'1');
 await f.service('deputy',propose);
 assert.equal(f.state().students[1].history[0].performer,'Tổ phó Một');
});
test('account sync refreshes officer display name without changing credential or student binding',async()=>{
 const f=laborFixture();await f.access.mutate('teacher',{action:'password',kind:'bcs',studentId:'1',password:'labor-rename-secret'});
 const uid=managedUid('demo','7n','bcs','1'),prior=f.db.rows.get(`${BASE}/_accessAccounts/${uid}`);
 f.state().students[0].name='Tên học sinh đã sửa';await f.access.sync('teacher');
 const account=f.db.rows.get(`${BASE}/_accessAccounts/${uid}`);
 assert.equal(account.displayName,'Tên học sinh đã sửa');assert.equal(account.studentId,'1');assert.equal(account.digest,prior.digest);
 assert.equal(f.db.rows.get(`${BASE}/members/${uid}`).displayName,'Tên học sinh đã sửa');
});
test('mismatched group has a stable recovery code and reads corrected assignment on the next request',async()=>{
 const f=fixture();f.db.rows.get(`${BASE}/members/deputy`).groupId='Tổ 2';
 await assert.rejects(f.service('deputy',{action:'view'}),e=>e.status===403 && e.code==='ASSIGNMENT_CHANGED');
 // Represents a GVCN-authorized correction; student requests never rewrite this binding.
 f.db.rows.get(`${BASE}/members/deputy`).groupId='Tổ 1';
 const view=await f.service('deputy',{action:'view'});assert.deepEqual(view.students.map(s=>s.id),['1','2']);
});
test('HTTP returns structured assignment recovery code without disclosing roster',async()=>{
 const f=fixture();f.db.rows.get(`${BASE}/members/deputy`).groupId='Tổ 2';
 const handler=makeHandler('deputy',async()=>({deputy:f.service}));
 const response=await handler(new Request('https://example.test/.netlify/functions/deputy',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer deputy'},body:JSON.stringify({action:'view'})}));
 assert.equal(response.status,403);const body=await response.json();assert.equal(body.code,'ASSIGNMENT_CHANGED');assert.equal(body.students,undefined);
});
test('multi-role student defaults to a valid assignment and each role keeps its own scope',async()=>{
 const f=fixture();asOfficer(f,'group');const first=f.state().officerRoles[0];first.groupName='Tổ 2';
 f.state().officerRoles.push({...first,key:'lop-pho-lao-dong',title:'Lớp phó lao động',scope:'all',groupName:''});
 const view=await f.service('deputy',{action:'view'});assert.equal(view.selectedRoleKey,'lop-pho-lao-dong');assert.equal(view.students.length,3);
 await assert.rejects(f.service('deputy',{action:'view',roleKey:first.key}),e=>e.code==='ASSIGNMENT_CHANGED');
 first.groupName='Tổ 1';const group=await f.service('deputy',{action:'view',roleKey:first.key});assert.deepEqual(group.students.map(s=>s.id),['1','2']);
 await assert.rejects(f.service('deputy',{...propose,studentId:'3',roleKey:first.key}),e=>e.status===403);
 await assert.rejects(f.service('deputy',{action:'view',roleKey:'unassigned-role'}),e=>e.status===403);
});
test('roster-only access returns neither scores nor attendance, and no-tab role returns no student data',async()=>{
 const f=fixture();asOfficer(f,'all');const role=f.state().officerRoles[0];role.canAccessTabs=['hoc-sinh'];
 let view=await f.service('deputy',{action:'view'});assert.equal(view.permissions.roster,true);assert.equal(view.permissions.scoresView,false);assert.equal(view.students[0].points,undefined);assert.equal(view.students[0].attendance,undefined);
 role.canAccessTabs=[];view=await f.service('deputy',{action:'view'});assert.deepEqual(view.students,[]);
});
test('attendance-view-only permission exposes status but still rejects mutation',async()=>{
 const f=fixture();asOfficer(f,'group');f.state().officerRoles[0].actions.add=false;f.state().officerRoles[0].canAccessTabs=['diem-danh'];
 f.state().attendanceRecords={'2026-09-14':{'1':'present'}};
 const view=await f.service('deputy',{action:'view'});assert.equal(view.permissions.attendanceView,true);assert.equal(view.permissions.attendance,false);assert.equal(view.students[0].attendance,'present');
 await assert.rejects(f.service('deputy',{action:'attendance',studentId:'1',status:'late'}),e=>e.status===403);
});

test('same authenticated BCS token loses old rights then receives reassigned rights without credential rotation',async()=>{
 const f=laborFixture();await f.access.mutate('teacher',{action:'password',kind:'bcs',studentId:'1',password:'dynamic-role-secret'});
 const uid=managedUid('demo','7n','bcs','1'),version=f.db.rows.get(`${BASE}/members/${uid}`).accessVersion;
 f.auth.verifyIdToken=async()=>({uid,accessVersion:version});
 await f.service('same-token',{action:'view'});
 await f.access.mutate('teacher',assignLabor);
 await assert.rejects(f.service('same-token',propose),e=>e.status===403);
 await f.access.sync('teacher');assert.equal(f.db.rows.get(`${BASE}/members/${uid}`).active,true);
 await f.access.mutate('teacher',{...assignLabor,studentId:'1',expectedStudentId:'2'});
 const next=await f.service('same-token',{action:'view'});assert.equal(next.identity.studentId,'1');assert.equal(next.selectedRoleKey,'lop-pho-lao-dong');
 assert.equal(f.db.rows.get(`${BASE}/members/${uid}`).accessVersion,version);
 assert.equal(f.db.rows.get(`${CLASS}/permissionSignals/current`).revision,f.db.rows.get(STATE).scoreRevision);
 await f.access.mutate('teacher',{action:'password',kind:'bcs',studentId:'1',password:'dynamic-new-secret'});
 await assert.rejects(f.service('same-token',{action:'view'}),e=>e.status===403);
});

test('direct score edit replaces own contribution and rejects stale concurrent edit',async()=>{
 const f=fixture();asOfficer(f);f.state().officerRoles[0].actions.edit=true;
 await f.service('deputy',{...propose,action:'score'});
 const entry=(await f.service('deputy',{action:'view'})).students.find(s=>s.id==='2').history[0];assert.equal(entry.canEdit,true);
 const edit={...propose,action:'score-edit',requestId:'score_edit_123456789',historyId:entry.id,expectedRecord:entry.version,points:-5,reason:'Sửa ghi nhận'};
 await f.service('deputy',edit);await f.service('deputy',edit);
 assert.equal(f.state().students[1].points,5);assert.equal(f.state().students[1].history.length,1);
 await assert.rejects(f.service('deputy',{...edit,requestId:'score_edit_stale_123'}),e=>e.status===409);
 f.state().officerRoles[0].actions.edit=false;
 await assert.rejects(f.service('deputy',{...edit,requestId:'score_edit_revoked_123'}),e=>e.status===403);
});
test('direct score retries cannot change payload or apply historical pending proposals',async()=>{
 const f=fixture();await f.service('deputy',propose);const before=structuredClone([...f.db.rows]);
 await assert.rejects(f.service('deputy',{...propose,points:5}),e=>e.status===409);assert.deepEqual([...f.db.rows],before);
 const id='legacy_pending_123456';f.db.rows.set(`${CLASS}/scoreProposals/${id}`,{status:'pending',createdBy:'deputy',studentId:'2',points:10});
 await assert.rejects(f.service('deputy',{...propose,requestId:id}),e=>e.status===409);assert.equal(f.state().students[1].points,7);
});
test('two officers scoring one student concurrently retain both awards and personal projection',async()=>{
 const f=fixture();const baseVerify=f.auth.verifyIdToken;
 f.auth.verifyIdToken=async token=>token==='other'?{uid:'other',accessVersion:1}:baseVerify(token);
 f.db.rows.set(`${BASE}/members/other`,{...f.db.rows.get(`${BASE}/members/deputy`),studentId:'2'});
 await Promise.all([f.service('deputy',{...propose,action:'score',points:2}),f.service('other',{...propose,action:'score',points:3,requestId:'other_officer_123456'})]);
 assert.equal(f.state().students[1].points,15);assert.equal(f.state().students[1].history.length,2);assert.equal(f.db.rows.get(STATE).scoreRevision,2);
 assert.equal(f.db.rows.get(`${CLASS}/studentViews/2`).state.students[0].points,15);
});
test('invalid scores and revoked assignment leave state, receipts and history unchanged',async()=>{
 for(const points of [0,101,-101,1.5,'abc','',null,true,[],{}]){
  const f=fixture(),before=structuredClone([...f.db.rows]);await assert.rejects(f.service('deputy',{...propose,action:'score',points}),e=>e.status===400);assert.deepEqual([...f.db.rows],before);
 }
 const f=fixture();asOfficer(f);await f.service('deputy',{action:'view'});f.state().officerRoles[0].assignedStudentId='2';const before=structuredClone([...f.db.rows]);
 await assert.rejects(f.service('deputy',{...propose,action:'score'}),e=>e.status===403);assert.deepEqual([...f.db.rows],before);
});
test('score edit version cannot become valid again after A to B to A in the same millisecond',async()=>{
 const f=fixture();await f.service('deputy',propose);
 const read=async()=> (await f.service('deputy',{action:'view'})).students.find(s=>s.id==='2').history[0];
 const initial=await read();
 const edit={...propose,action:'score-edit',historyId:initial.id,expectedRecord:initial.version,requestId:'edit_same_ms_one_123',points:-5};
 await f.service('deputy',edit);await f.service('deputy',{...edit,points:-3,expectedRecord:(await read()).version,requestId:'edit_same_ms_two_123'});
 assert.notEqual((await read()).version,initial.version);
 await assert.rejects(f.service('deputy',{...edit,requestId:'edit_same_ms_old_123'}),e=>e.status===409);
});
test('failure writing personal projection rolls back score, receipt and audit; retry writes once',async()=>{
 const f=fixture(),transaction=f.db.runTransaction.bind(f.db),before=structuredClone([...f.db.rows]);
 f.db.runTransaction=fn=>transaction(tx=>fn({...tx,set:(ref,value)=>{if(ref.path.includes('/studentViews/'))throw new Error('Simulated write failure');tx.set(ref,value);}}));
 await assert.rejects(f.service('deputy',propose),/Simulated write failure/);assert.deepEqual([...f.db.rows],before);
 f.db.runTransaction=transaction;await f.service('deputy',propose);await f.service('deputy',propose);assert.equal(f.state().students[1].points,7);assert.equal(f.state().students[1].history.length,1);
});
test('transaction callback retry does not apply the same award twice',async()=>{
 const f=fixture(),transaction=f.db.runTransaction.bind(f.db);let callbacks=0;
 f.db.runTransaction=async fn=>{callbacks++;await fn({get:async ref=>f.db.snap(ref),set:()=>{},update:()=>{},delete:()=>{}});return transaction(tx=>{callbacks++;return fn(tx);});};
 await f.service('deputy',propose);assert.equal(callbacks,2);assert.equal(f.state().students[1].points,7);assert.equal(f.state().students[1].history.length,1);
});
