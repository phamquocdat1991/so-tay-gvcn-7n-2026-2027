import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('role migration fills all deputies, preserves assignments and custom permissions, and is idempotent',()=>{
 const policy=html.slice(html.indexOf('const OFFICER_ROLE_POLICY ='),html.indexOf('let state =',html.indexOf('const OFFICER_ROLE_POLICY =')));
 const start=html.indexOf('if (!state.officerRoles) state.officerRoles = [];');
 const migration=html.slice(start,html.indexOf('if (state.settings.rbacPolicyVersion',start));
 const existing={key:'lop-pho-hoc-tap',assignedStudentId:'42',status:'inactive',actions:{add:false},allowedCategories:['Riêng']};
 const state={students:[],officerRoles:[existing,{key:'lop-truong',assignedStudentId:'43'}]};
 const context=vm.createContext({state,parseTagsList:()=>[]});
 vm.runInContext(policy+'\n'+migration,context);
 assert.deepEqual(state.officerRoles.slice(0,5).map(r=>r.key),['lop-truong','lop-pho-hoc-tap','lop-pho-lao-dong','lop-pho-ky-luat','lop-pho-phong-trao']);
 assert.equal(state.officerRoles[1],existing);assert.equal(existing.actions.add,false);
 const count=state.officerRoles.length;
 vm.runInContext('{'+migration+'}',context);assert.equal(state.officerRoles.length,count);
});
const source=readFileSync(new URL('../firebase-secure.js',import.meta.url),'utf8');
const api=source.slice(source.indexOf('const apiPost ='),source.indexOf('window.cloudServices ='));
function getApi(fetch){return vm.runInNewContext(api+'\napiPost',{fetch,AbortController,setTimeout,clearTimeout,TypeError});}
test('API network failures become actionable messages',async()=>{
 await assert.rejects(getApi(async()=>{throw new TypeError('Failed to fetch');})('access-admin',{action:'list'}),/Kiểm tra mạng/);
});
test('API preserves permission errors and rejects HTML fallback pages',async()=>{
 await assert.rejects(getApi(async()=>({ok:false,status:403,headers:{get:()=> 'application/json'},json:async()=>({error:'Không có quyền'})}))('access-admin',{}),e=>e.status===403);
 await assert.rejects(getApi(async()=>({status:200,headers:{get:()=> 'text/html'}}))('access-admin',{}),/Netlify Functions/);
});
