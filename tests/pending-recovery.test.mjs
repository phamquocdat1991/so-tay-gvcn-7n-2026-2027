import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const slice=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
function setup(){
 const server={students:[{id:1,points:10}]},draft={students:[{id:1,points:12}]};
 const c=vm.createContext({window:{secureMode:true,useCloud:true,cloudUser:{uid:'test'},cloudMembership:{role:'gvcn'},cloudStateScoreRevision:0,pendingSyncState:{owner:'test',base:JSON.stringify(server),serialized:JSON.stringify(draft)},cloudServices:{}},state:{},currentLoginRole:'gvcn',cloudStateUnsubscribe:null,isDataLoaded:false,isAuthenticated:true,saveInProgress:false,lastSavedStateSignature:'',queuedSaveContext:null,console:{warn(){},error(){}},navigator:{onLine:true},document:{getElementById:()=>null},enforceAuthenticatedRoleContext:()=>({ok:true}),setRealtimeSyncStatus:()=>{},renderCloudLoadingView:()=>{},resetCloudSubscriptionRetry:()=>{},pendingStorageKey:()=>'test',getCloudSafeState:s=>s,cloudSnapshotEnvelope:s=>({data:s.data(),revision:s.data().scoreRevision,fromCache:!!s.metadata?.fromCache}),applyStateDefaults:()=>{},renderLayout:()=>{},syncNotice:()=>{},scheduleDraftAutoSync:()=>{},readPendingDraftForCurrentUser:()=>c.window.pendingSyncState});
 let listener;c.window.cloudServices.subscribeState=fn=>{listener=fn;return ()=>{};};
 vm.runInContext(slice('        function sameCloudStateSignature(', '        function scheduleDraftAutoSync('),c);
 vm.runInContext(slice('        window.startApp = function()', '\n        function fallbackLoad'),c);
 return {c,server,draft,run:async(fromCache=false)=>{c.window.startApp();await listener({exists:()=>true,data:()=>({state:server,scoreRevision:7}),metadata:{fromCache}});}};
}
test('reopening pending draft establishes confirmed base and revision before autosync',async()=>{
 const f=setup();await f.run();assert.equal(f.c.lastSavedStateSignature,JSON.stringify(f.server));assert.equal(f.c.window.cloudStateScoreRevision,7);assert.equal(f.c.state.students[0].points,12);
});
test('matching cache is not treated as server confirmation for draft recovery',async()=>{
 const f=setup();let scheduled=0;f.c.scheduleDraftAutoSync=()=>scheduled++;await f.run(true);assert.equal(scheduled,0);assert.equal(f.c.lastSavedStateSignature,'');
});
test('save revision conflict stops network retries, retains draft and reports conflict',async()=>{
 let retries=0;
 const c=vm.createContext({window:{secureMode:true,cloudUser:{uid:'test'},cloudMembership:{role:'gvcn'},cloudServices:{}},state:{students:[{id:1,points:12}]},currentLoginRole:'gvcn',lastSavedStateSignature:'',saveInProgress:false,queuedSaveContext:null,navigator:{onLine:true},console:{error(){},warn(){}},enforceAuthenticatedRoleContext:()=>({ok:true}),setLastSaveOutcome:(status)=>{c.window.lastSaveOutcome={status};},getCloudSafeState:()=>c.state,persistMutationSnapshotBeforeCloud:()=> 'local',hasCloudWriteApi:()=>true,saveCloudSnapshot:async()=>{throw Object.assign(new Error('Conflict'),{code:'cloud/revision-conflict'});},classifyFirebaseError:e=>({code:e.code}),retainPendingState:serialized=>{c.window.pendingSyncState={serialized};},setRealtimeSyncStatus:()=>{},syncNotice:()=>{},dispatchPersistenceStateEvent:()=>{},schedulePendingCloudRetry:()=>retries++,resetCloudRetryState:()=>{},setTimeout:()=>0});
 vm.runInContext(slice('        async function saveData(', '\n        function applyStateDefaults'),c);
 await c.saveData();assert.equal(c.window.lastSaveOutcome.status,'conflict');assert.equal(retries,0);assert.equal(c.window.syncRemoteConflict,true);assert(c.window.pendingSyncState);
});
test('restored unchanged-base draft actually reaches the writer instead of rescheduling forever',async()=>{
 const f=setup();await f.run();let writes=0;
 f.c.saveData=async()=>{writes++;f.c.window.pendingSyncState=null;return true;};
 f.c.cleanupTransientAppStorageAfterCloudAck=()=>{};
 vm.runInContext(slice('        async function autoSyncPendingDraft(', '\n        window.triggerDraftAutoSync'),f.c);
 assert.equal(await f.c.autoSyncPendingDraft(),true);assert.equal(writes,1);
});
test('teacher remark waits for the save outcome before displaying a result',async()=>{
 let resolve,resultCount=0;
 const c=vm.createContext({window:{},state:{students:[{id:1,name:'Test pupil'}],admin:{}},currentLoginRole:'gvcn',reportSummarySemester:'HK1',document:{getElementById:()=>({value:'Nhận xét thử'})},getReportRemarkKey:()=> '1_HK1',showToast:()=>assert.fail('Premature toast'),saveData:()=>new Promise(r=>resolve=r),showPersistenceOutcomeToast:()=>resultCount++});
 vm.runInContext(slice('window.saveTeacherRemark =', '\nfunction renderChiTietBaoCaoContent'),c);
 const pending=c.window.saveTeacherRemark('1');assert.equal(resultCount,0);resolve(false);await pending;assert.equal(resultCount,1);
});

test('restored draft accepts confirmed base with reordered object keys',async()=>{
 const f=setup();f.c.window.pendingSyncState.base=JSON.stringify({students:[{points:10,id:1}]});
 await f.run();assert.equal(f.c.window.syncRemoteConflict,false);assert.equal(f.c.window.cloudStateScoreRevision,7);
});
test('queued edit survives first acknowledgement with a durable updated base',async()=>{
 let ack;const durable={};const scheduled=[];
 const base=JSON.stringify({students:[{id:1,points:10}]});
 const c=vm.createContext({window:{secureMode:true,cloudUser:{uid:'test'},cloudMembership:{role:'gvcn'},cloudServices:{},undoStack:[]},state:{students:[{id:1,points:12}]},currentLoginRole:'gvcn',lastSavedStateSignature:base,saveInProgress:false,queuedSaveContext:null,navigator:{onLine:true},console,
 enforceAuthenticatedRoleContext:()=>({ok:true}),setLastSaveOutcome:()=>{},getCloudSafeState:()=>JSON.parse(JSON.stringify(c.state)),
 persistMutationSnapshotBeforeCloud:(state,serialized,base)=>{c.retainPendingState(serialized,base);return 'local';},
 retainPendingState:(serialized,base)=>{c.window.pendingSyncState={serialized,base,owner:'test'};Object.assign(durable,c.window.pendingSyncState);},
 hasCloudWriteApi:()=>true,saveCloudSnapshot:()=>new Promise(r=>ack=r),cleanupTransientAppStorageAfterCloudAck:()=>{},recordAudit:async()=>{},maybeCreateAutoBackup:async()=>{},dispatchPersistenceStateEvent:()=>{},clearTimeout:()=>{},setTimeout:fn=>{scheduled.push(fn);return 0;},syncNotice:()=>{},resetCloudRetryState:()=>{}});
 vm.runInContext(slice('        async function saveData(', '\n        function applyStateDefaults'),c);
 const first=c.saveData({skipUndo:true});c.state.students[0].points=15;await c.saveData({skipUndo:true});ack();await first;
 assert.equal(JSON.parse(durable.base).students[0].points,12);assert.equal(JSON.parse(durable.serialized).students[0].points,15);
 assert.equal(c.window.pendingSyncState.base,c.lastSavedStateSignature);assert.equal(scheduled.length,1);
});
