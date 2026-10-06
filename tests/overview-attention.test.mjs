import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('function getOverviewAttentionStudents()');
const source=html.slice(start,html.indexOf('function getOverviewProgressPeriodRange',start));
function run(students){const c=vm.createContext({state:{students,attendanceRecords:{}},getOverviewRecentRange:()=>({start:new Date('2026-09-01'),end:new Date('2026-10-01')})});vm.runInContext(source,c);return c.getOverviewAttentionStudents();}
const reset={date:'2026-09-15',points:-100,source:'points-reset',reason:'Đặt lại điểm thi đua về 0 (Toàn lớp)'};
test('reset zero, untouched zero and small positive totals do not qualify',()=>{
 assert.equal(run([{id:1,points:0,history:[reset]},{id:2,points:0},{id:3,points:1},{id:4,points:100}]).length,0);
});
test('past penalties do not put a reset-zero student back into the list',()=>{
 assert.equal(run([{points:0,history:[{date:'2026-09-14',points:-5,reason:'Đi muộn'},reset]}]).length,0);
});
test('negative score qualifies; reset entries never inflate severity or become the reason',()=>{
 const row=run([{points:-3,history:[reset,{date:'2026-09-16',points:-3,reason:'Vi phạm nề nếp'}]}])[0];
 assert.equal(row.negativeCount,1);assert.equal(row.negativePoints,3);assert.equal(row.reason,'Vi phạm nề nếp');
});
test('explicit attention remains visible even with zero or positive scores; false flag does not qualify',()=>{
 const rows=run([{points:0,needsAttention:true,attentionReason:'GVCN yêu cầu theo dõi',history:[reset]},{points:5,needsAttention:true},{points:0,needsAttention:false}]);
 assert.equal(rows.length,2);assert(rows.some(r=>r.reason==='GVCN yêu cầu theo dõi'));
});
