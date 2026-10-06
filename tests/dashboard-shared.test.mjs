import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const shared=readFileSync(new URL('../class-dashboard.js',import.meta.url),'utf8');
test('GVCN overview still renders shared hero and preserves teacher banner controls',()=>{
 const c=vm.createContext({window:{},state:{theme:{}},currentLoginRole:'gvcn',readOverviewBannerLocal:()=>'',escapeHtmlAttr:v=>String(v).replace(/[<>&"]/g,'')});
 vm.runInContext(shared,c);
 const start=html.indexOf('        function getPageBannerConfig('),end=html.indexOf('        // ================= END SHARED PAGE BANNERS',start);
 vm.runInContext(html.slice(start,end),c);
 const result=vm.runInContext("renderPageBanner('overview',{title:'Cô giáo',badges:[{label:'LỚP 7N'}]})",c);
 assert.match(result,/overview-hero-card/);assert.match(result,/Cô giáo/);assert.match(result,/handleBannerUpload/);assert.match(result,/<svg/);
});
test('shared cards escape student text and preserve teacher directory accessibility hooks',()=>{
 const c=vm.createContext({window:{}});vm.runInContext(shared,c);
 const result=c.window.ClassDashboard.card({title:'<img onerror=alert(1)>',value:8,note:'Tổ 1',studentList:true,id:'total-students-card',tone:'violet',icon:'roster'});
 assert(!result.includes('<img'));assert.match(result,/aria-controls="student-list-modal"/);assert.match(result,/student-list-open-status/);
});
