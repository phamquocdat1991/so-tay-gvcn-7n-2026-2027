import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../firebase-secure.js', import.meta.url), 'utf8');
function fixture(current, revision) {
  const writes = [];
  const context = vm.createContext({ window:{cloudStateScoreRevision:revision}, db:{}, stateRef:'state',
    studentViewRef:id=>`student/${id}`, auth:{currentUser:{uid:'teacher'}},
    runTransaction:async (db,fn)=>fn({get:async()=>({data:()=>current}),set:(ref,value)=>writes.push({ref,value})}) });
  const methods = source.slice(source.indexOf('      saveState: state =>'),source.indexOf('      createBackup:'));
  const services = vm.runInContext(`({${methods}})`,context);
  return {writes,context,services};
}
test('stale teacher snapshot cannot overwrite a deputy score revision',async()=>{
  const f=fixture({state:{students:[{id:1,points:12}]},scoreRevision:2},1);
  await assert.rejects(f.services.saveState({students:[{id:1,points:10}]}),/Điểm vừa được cập nhật/);
  assert.equal(f.writes.length,0);
  assert.equal(f.context.window.scoreSyncConflict.state.students[0].points,12);
});
test('current teacher write increments and returns the revision',async()=>{
  const f=fixture({state:{},scoreRevision:2},2);
  const result=await f.services.saveState({students:[]});assert.equal(f.writes[0].value.scoreRevision,3);assert.equal(result.scoreRevision,3);
});
test('delayed personal-view publisher skips stale points and history',async()=>{
  const f=fixture({state:{students:[{id:1,points:12,history:[{id:'new',points:2}]}]},scoreRevision:2},2);
  await f.services.saveStudentViews([{studentId:1,state:{students:[{id:1,points:10,history:[]}]}}]);
  assert.equal(f.writes.length,0);
  await f.services.saveStudentViews([{studentId:1,state:{students:[{id:1,points:12,history:[{id:'new',points:2}]}]}}]);
  assert.equal(f.writes.length,1);assert.equal(f.writes[0].ref,'student/1');
});
test('two teachers based on the same revision cannot overwrite each other',async()=>{
 const current={state:{students:[{id:1,points:0},{id:2,points:0}]},scoreRevision:0};
 const first=fixture(current,0),second=fixture(current,0);
 await first.services.saveState({students:[{id:1,points:2},{id:2,points:0}]});
 Object.assign(current,first.writes[0].value);
 await assert.rejects(second.services.saveState({students:[{id:1,points:0},{id:2,points:3}]}),e=>e.code==='cloud/revision-conflict');
 assert.equal(current.state.students[0].points,2);assert.equal(second.writes.length,0);
});

test('teacher state write publishes a revision-only permission signal in the same transaction',async()=>{
 const f=fixture({state:{},scoreRevision:2},2);f.context.window.cloudMembership={role:'gvcn'};f.context.permissionSignalRef='signal';
 await f.services.saveState({students:[]});const signal=f.writes.find(w=>w.ref==='signal');assert.equal(signal.value.revision,3);assert.deepEqual(Object.keys(signal.value).sort(),['revision','updatedAt']);
});

test('retry after lost acknowledgement accepts identical state without another revision',async()=>{
 const state={students:[{id:1,points:12,history:[{id:'saved',points:2}]}]};
 const f=fixture({state,scoreRevision:4},3);
 const result=await f.services.saveState(state);
 assert.equal(result.scoreRevision,4);assert.equal(result.alreadyCommitted,true);assert.equal(f.writes.length,0);
});
test('retry compares nested object content without depending on key order',async()=>{
 const f=fixture({state:{students:[{points:12,id:1}],theme:{title:'A',month:'B'}},scoreRevision:4},3);
 const result=await f.services.saveState({theme:{month:'B',title:'A'},students:[{id:1,points:12}]});
 assert.equal(result.alreadyCommitted,true);assert.equal(f.writes.length,0);
});
test('retry must not ignore history array order or unrelated state changes',async()=>{
 const state={students:[{id:1,points:12,history:[{id:'a'},{id:'b'}]}],note:'new'};
 for(const next of [{...state,note:'old'},{...state,students:[{id:1,points:12,history:[{id:'b'},{id:'a'}]}]}]){
  const f=fixture({state,scoreRevision:4},3);
  await assert.rejects(f.services.saveState(next),e=>e.code==='cloud/revision-conflict');assert.equal(f.writes.length,0);
 }
});
