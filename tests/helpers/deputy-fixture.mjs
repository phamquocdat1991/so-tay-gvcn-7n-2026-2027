import assert from 'node:assert/strict';
import {createDeputyService} from '../../server/deputy-service.mjs';
import {createAccessService} from '../../server/access-service.mjs';
const BASE = 'artifacts/demo', CLASS = `${BASE}/classes/7n`, STATE = `${CLASS}/state/main`;
class Ref {
  constructor(db, path, filter) { Object.assign(this, { db, path, filter }); }
  get id() { return this.path.split('/').at(-1); }
  collection(name) { return new Ref(this.db, `${this.path}/${name}`); }
  doc(id = `auto-${++this.db.seq}`) { return new Ref(this.db, `${this.path}/${id}`); }
  where(key, op, value) { assert.equal(op, '=='); return new Ref(this.db, this.path, [key, value]); }
  async get() { return this.db.snap(this); }
}
class Store {
  rows = new Map(); seq = 0; queue = Promise.resolve();
  collection(path) { return new Ref(this, path); }
  snap(ref) {
    const value = structuredClone(this.rows.get(ref.path));
    if (ref.path.split('/').length % 2 === 0) return { exists:value !== undefined, id:ref.id, data:() => structuredClone(value) };
    return { docs:[...this.rows].filter(([key,value]) => key.startsWith(ref.path + '/') && key.split('/').length === ref.path.split('/').length + 1 && (!ref.filter || value[ref.filter[0]] === ref.filter[1])).map(([path]) => this.snap(new Ref(this,path))) };
  }
  runTransaction(fn) {
    const promise = this.queue.then(async () => {
      const writes = [];
      const result = await fn({ get:async ref => { assert.equal(writes.length,0,'reads must precede writes'); return this.snap(ref); },
        set:(ref,value) => writes.push(['set',ref.path,structuredClone(value)]),
        update:(ref,value) => writes.push(['update',ref.path,structuredClone(value)]), delete:ref => writes.push(['delete',ref.path]) });
      for (const [op,path,value] of writes) {
        if (op === 'delete') this.rows.delete(path);
        else this.rows.set(path,op === 'update' ? { ...this.rows.get(path),...value } : value);
      }
      return result;
    });
    this.queue = promise.catch(() => {}); return promise;
  }
}
export function fixture() {
  const db = new Store();
  db.rows.set(STATE,{ state:{ students:[
    { id:1,name:'Tổ phó Một',group:'Tổ 1',code:'12345',password:'private',points:10,stars:10,history:[] },
    { id:2,name:'Bạn Hai',group:'Tổ 1',code:'23456',phone:'private',points:10,stars:10,history:[] },
    { id:3,name:'Ngoài tổ',group:'Tổ 2',code:'34567',points:20,stars:20,history:[] }],
    weeklyCompetition:{ start:'2026-09-14' }, officerRoles:[{status:'active',assignedStudentId:'1',title:'BCS'}],
    dutyRoster:{settings:{linkPoints:true},weeks:{'2026-09-14':{assignments:{mon:{morning:[1,2,3]}},evaluations:{}}}} } });
  db.rows.set(`${BASE}/members/deputy`,{active:true,role:'to_pho',studentId:'1',classId:'7n',groupId:'Tổ 1',authMode:'simple',accessVersion:1,displayName:'Tổ phó Một'});
  db.rows.set(`${BASE}/members/teacher`,{active:true,role:'gvcn',classId:'7n'});
  const auth = { verifyIdToken:async token => {
    if (token === 'deputy') return { uid:'deputy',accessVersion:1 };
    if (token === 'teacher') return {uid:'teacher'};
    throw new Error('invalid');
  }, createCustomToken:async (uid,claims) => ({uid,...claims}) };
  const args = {db,auth,appId:'demo',classId:'7n',clock:() => Date.parse('2026-09-14T09:00:00Z')};
  return {db,auth,service:createDeputyService(args),access:createAccessService({...args,secret:'unit-test-secret-with-thirty-two-characters'}),state:() => db.rows.get(STATE).state};
}
