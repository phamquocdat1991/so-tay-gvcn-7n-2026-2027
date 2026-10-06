import fs from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {parseHTML} from 'linkedom';
const {document}=parseHTML('<html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ban cán sự — xem trước bằng dữ liệu minh họa</title></head><body style="margin:0"><div id="app"></div></body></html>');
const students=Array.from({length:8},(_,i)=>({id:String(i+1),name:'Học sinh '+String(i+1).padStart(2,'0'),group:'Tổ '+(1+i%4),points:10+i,history:[{id:'demo'+i,date:'2026-10-05',points:2,reason:'Tích cực phát biểu xây dựng bài',category:'Học tập',performer:'Bạn Minh',canEdit:false}],attendance:i===7?'excused':'present'}));
const data={role:'bcs',className:'Lớp 7N',today:'2026-10-05',week:'2026-10-05',groupId:null,selectedRoleKey:'lop-truong',availableRoles:[],identity:{name:'Bạn Minh',title:'Lớp trưởng'},students,duties:[],subjects:[{id:'math',name:'Toán'}],grades:[],permissions:{roster:true,scoresView:true,attendanceView:true,attendance:true,dutyView:true,duty:true,points:true,directScore:true,scoreEdit:true,grades:true,categories:['Nề nếp','Học tập']}};
const window={cloudUser:{uid:'demo'},cloudMembership:{role:'bcs'},cloudServices:{deputy:async()=>data}};
const context=vm.createContext({window,document,crypto:{randomUUID},setInterval:()=>0,clearInterval:()=>{},setTimeout,clearTimeout,confirm:()=>false});
for(const file of ['class-dashboard.js','to-pho.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
await window.openDeputyWorkspace();document.getElementById('deputy-dashboard-theme').remove();
for(const file of ['class-dashboard.css','deputy-dashboard.css']){const style=document.createElement('style');style.textContent=fs.readFileSync(file,'utf8');document.head.appendChild(style);}
document.querySelector('.overview-hero-chip').textContent='BẢN XEM TRƯỚC • DỮ LIỆU MINH HỌA';
document.querySelectorAll('form button,form input,form select,form textarea').forEach(e=>{e.disabled=true;});
const script=document.createElement('script');script.textContent=`document.querySelectorAll('[data-panel-link]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==b.dataset.panelLink);document.querySelectorAll('[data-panel-link]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});document.querySelectorAll('[data-action],#logout').forEach(b=>b.onclick=()=>alert('Bản minh họa, không kết nối hoặc ghi dữ liệu lớp thật.'));`;
document.body.appendChild(script);fs.writeFileSync('XEM_TRUOC_BAN_CAN_SU.html','<!DOCTYPE html>\n'+document.documentElement.outerHTML);
