import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('badge renders from current assignment without network and disappears when revoked or moved',()=>{
 const state={deputyAssignments:[{studentId:'1',groupId:'Tổ 1',role:'to_pho',active:true}]};
 const c=vm.createContext({state,parseTagsList:v=>v?[v]:[],escapeHtmlAttr:v=>String(v)});
 const start=html.indexOf('function escapeClassroomRoleText(');
 vm.runInContext(html.slice(start,html.indexOf('function renderClassroomSeat(',start)),c);
 const student={id:1,group:'Tổ 1'};
 assert.match(c.renderClassroomRoleBadge(student),/role-group-deputy/);
 assert.match(c.renderClassroomRoleBadge(student),/Tổ phó/);
 student.group='Tổ 2';assert.equal(c.renderClassroomRoleBadge(student),'');
 student.group='Tổ 1';state.deputyAssignments=[];assert.equal(c.renderClassroomRoleBadge(student),'');
 assert(!html.includes('syncDeputyBadgeState'));
});
