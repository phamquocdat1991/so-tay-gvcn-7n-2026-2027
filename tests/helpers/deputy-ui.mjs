import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {parseHTML} from 'linkedom';
const source=readFileSync(new URL('../../to-pho.js',import.meta.url),'utf8');
export const tick=()=>new Promise(r=>setImmediate(r));
export const blocked=()=>Object.assign(new Error('Phân công tổ chưa khớp'),{status:403,code:'ASSIGNMENT_CHANGED'});
export const view={role:'bcs',title:'Tổ 2',today:'2026-10-04',week:'2026-09-28',identity:{name:'Học sinh thử',title:'Tổ trưởng Tổ 2'},students:[],duties:[],proposals:[],permissions:{}};
export function setup(services={}) {
 const {document,Event}=parseHTML('<html><head></head><body><div id="app"></div></body></html>');let timer,signal,exits=0;
 // linkedom lacks the native SELECT value setter/default-first-option behavior.
 const prototype=Object.getPrototypeOf(document.createElement('select'));
 Object.defineProperty(prototype,'value',{configurable:true,get(){const options=[...this.querySelectorAll('option')];return (options.find(o=>o.hasAttribute('selected'))||options[0])?.getAttribute('value') ?? (options.find(o=>o.hasAttribute('selected'))||options[0])?.textContent ?? '';},set(value){for(const o of this.querySelectorAll('option')){if((o.getAttribute('value')??o.textContent)===String(value))o.setAttribute('selected','');else o.removeAttribute('selected');}}});
 const window={cloudUser:{uid:'student'},cloudMembership:{role:'bcs'},cloudServices:{subscribePermissionChanges:fn=>{signal=fn;return ()=>{signal=null;};},deputy:async()=>{throw blocked();},refreshSession:async()=>({role:'bcs'}),signOut:async()=>{},...services},handleCloudAuthState:()=>exits++};
 class DOMFormData { constructor(form){this.values=[...form.querySelectorAll('[name]')].filter(e=>!e.disabled).map(e=>[e.name||e.getAttribute('name'),e.value]);} entries(){return this.values[Symbol.iterator]();} [Symbol.iterator](){return this.entries();} get(name){return this.values.find(e=>e[0]===name)?.[1]??null;} }
 const c=vm.createContext({window,document,FormData:DOMFormData,crypto:{randomUUID},confirm:()=>true,setTimeout,clearTimeout,setInterval:fn=>{timer=fn;return 1;},clearInterval:()=>{timer=null;}});
 vm.runInContext(readFileSync(new URL('../../class-dashboard.js',import.meta.url),'utf8'),c);
 vm.runInContext(source,c);
 return {window,document,notify:async()=>{signal?.();await new Promise(r=>setTimeout(r,140));},open:()=>window.openDeputyWorkspace(),exits:()=>exits,poll:()=>timer?.(),click:async action=>{document.querySelector(`[data-action="${action}"]`).dispatchEvent(new Event('click',{bubbles:true}));await tick();}};
}
