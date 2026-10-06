import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function assignedFunction(name) {
 const start=html.indexOf(`        window.${name} = `);
 assert(start>=0);
 return html.slice(start,html.indexOf('\n        };',start)+12);
}
for(const role of ['bcs','to_pho']) test(`${role} startup uses server workspace without subscribing to forbidden class state`,()=>{
 let opened=0,unsubscribed=0;
 const ctx=vm.createContext({window:{secureMode:true,useCloud:true,cloudUser:{uid:'officer'},cloudMembership:{role},openDeputyWorkspace:()=>opened++,cloudServices:{subscribeState:()=>assert.fail('Forbidden subscription')}},cloudStateUnsubscribe:()=>unsubscribed++,enforceAuthenticatedRoleContext:()=>({ok:true}),setRealtimeSyncStatus:()=>{},isDataLoaded:false});
 vm.runInContext(assignedFunction('startApp'),ctx);ctx.window.startApp();
 assert.equal(opened,1);assert.equal(unsubscribed,1);assert.equal(ctx.isDataLoaded,true);
});
test('batch grades persist once and wait for save outcome before announcing it',async()=>{
 let saves=0,toasts=0,resolveSave;const changes=[];
 const ctx=vm.createContext({window:{},document:{getElementById:id=>({value:id==='quick-sub-id'?'math':'1'}),querySelectorAll:()=>[1,2].map(id=>({value:'8',getAttribute:()=>String(id)}))},currentGradeSemester:'HK1',getAcademicGradeActorName:()=>'Teacher',saveAcademicScoreRecord:(...args)=>{changes.push(args);return true;},captureUiScrollPosition:()=>{},closeModal:()=>{},renderLayout:()=>{},saveData:()=>{saves++;return new Promise(r=>resolveSave=r);},showPersistenceOutcomeToast:()=>toasts++});
 vm.runInContext(assignedFunction('submitBatchGradeEntry'),ctx);
 const pending=ctx.window.submitBatchGradeEntry();
 assert.equal(saves,1);assert.equal(toasts,0);assert.equal(changes.length,2);assert(changes.every(args=>args[6].deferSave));
 resolveSave(false);await pending;assert.equal(toasts,1);
});
for (const status of ['committed','blocked-permission']) test(`labor assignment requires confirmed persistence: ${status}`,async()=>{
 const requests=[];const state={officerRoles:[{key:'lop-pho-lao-dong',assignedStudentId:'1',title:'Lớp phó lao động'}]};
 const ctx=vm.createContext({state,currentLoginRole:'gvcn',window:{secureMode:true,useCloud:true,lastSaveOutcome:{status},cloudServices:{accessAdmin:async request=>{requests.push(request);return {studentId:'2',studentName:'Em mới',title:'Lớp phó lao động'};}},startApp:()=>{}},saveData:async()=>true,showToast:()=>{},showPersistenceOutcomeToast:()=>{}});
 vm.runInContext(assignedFunction('updateOfficerAssignment'),ctx);
 await ctx.window.updateOfficerAssignment('lop-pho-lao-dong','2');
 assert.equal(requests.length,status==='committed'?1:0);
 assert.equal(state.officerRoles[0].assignedStudentId,'1','local role must wait for authoritative snapshot');
 if(requests.length){assert.equal(requests[0].expectedStudentId,'1');assert.equal(requests[0].studentId,'2');}
});
