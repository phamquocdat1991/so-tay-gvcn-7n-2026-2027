import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../firebase-secure.js',import.meta.url),'utf8');
function setup(version=1){
 const calls=[];const user={uid:'one',getIdToken:async force=>calls.push(['token',force]),getIdTokenResult:async()=>({claims:{accessVersion:1}})};
 const membership={active:true,role:'bcs',authMode:'simple',accessVersion:version,studentId:'2'};
 let services;
 const c=vm.createContext({window:{cloudMembership:{studentId:'old'}},auth:{currentUser:user},memberRef:uid=>uid,getDoc:async()=>assert.fail('Must use server read'),getDocFromServer:async()=>{calls.push(['server']);return {exists:()=>true,id:'one',data:()=>membership};},getMembership:(uid,force)=>services.readMembership(uid,force),setTimeout,clearTimeout});
 const read=source.slice(source.indexOf('    const readMembership ='),source.indexOf('    const apiPost ='));
 const refresh=source.slice(source.indexOf('    const refreshSession ='),source.indexOf('    window.cloudServices ='));
 services=vm.runInContext(read+refresh+'\n({readMembership,refreshSession})',c);
 return {c,services,calls,user};
}
test('manual refresh forces token refresh and server membership read',async()=>{const f=setup();await f.services.refreshSession();assert.deepEqual(f.calls,[['token',true],['server']]);assert.equal(f.c.window.cloudMembership.studentId,'2');});
test('new accessVersion requires credential login and never overwrites membership from stale session',async()=>{const f=setup(2);await assert.rejects(f.services.refreshSession(),e=>e.code==='SESSION_CHANGED');assert.equal(f.c.window.cloudMembership.studentId,'old');});
test('account switch during refresh cannot publish the former account membership',async()=>{const f=setup();f.user.getIdToken=async()=>{f.c.auth.currentUser={uid:'two'};};await assert.rejects(f.services.refreshSession(),e=>e.code==='SESSION_CHANGED');assert.equal(f.c.window.cloudMembership.studentId,'old');});
