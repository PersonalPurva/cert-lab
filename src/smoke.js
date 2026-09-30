// Minimal DOM shim to run the app's render logic headlessly and catch runtime errors.
const fs = require('fs');
const data = fs.readFileSync(__dirname + '/data.json', 'utf8');

const byId = {};
function mkStyle(){ const s={ _props:{}, setProperty(k,v){this._props[k]=String(v); this[k]=String(v);}, getPropertyValue(k){return this._props[k]||'';}, removeProperty(k){delete this._props[k];} }; return s; }
function mkEl(tag){
  const e = {
    tagName:(tag||'div').toUpperCase(), _tag:tag, children:[], childNodes:[], nodeType:1,
    _text:'', style:mkStyle(), dataset:{}, attrs:{}, _listeners:{},
    disabled:false, value:'', checked:false, type:'', placeholder:'',
    parentNode:null, nextSibling:null,
    classList:{
      _s:new Set(),
      add(...c){c.forEach(x=>this._s.add(x));}, remove(...c){c.forEach(x=>this._s.delete(x));},
      contains(x){return this._s.has(x);}, toggle(x){this._s.has(x)?this._s.delete(x):this._s.add(x);}
    },
    after(node){ if(this.parentNode){ const p=this.parentNode; const i=p.childNodes.indexOf(this); p.childNodes.splice(i+1,0,node); node.parentNode=p; p.children=p.childNodes.filter(x=>x.nodeType===1);} },
    before(node){ if(this.parentNode){ const p=this.parentNode; const i=p.childNodes.indexOf(this); p.childNodes.splice(i,0,node); node.parentNode=p; p.children=p.childNodes.filter(x=>x.nodeType===1);} },
    get textContent(){return this._text;},
    set textContent(v){this._text=String(v); this.children=[]; this.childNodes=[];},
    get firstChild(){return this.childNodes[0]||null;},
    append(...ns){for(const n of ns){const node=(typeof n==='string')?mkText(n):n; node.parentNode=this; this.children.push(node); this.childNodes.push(node);} /* real DOM: append() returns undefined */},
    appendChild(n){this.append(n); return n;},
    insertBefore(n,ref){n.parentNode=this; const i=this.childNodes.indexOf(ref); if(i<0)this.childNodes.push(n); else this.childNodes.splice(i,0,n); this.children=this.childNodes.filter(x=>x.nodeType===1); return n;},
    removeChild(n){const i=this.childNodes.indexOf(n); if(i>=0)this.childNodes.splice(i,1); this.children=this.childNodes.filter(x=>x.nodeType===1); return n;},
    setAttribute(k,v){this.attrs[k]=String(v); if(k==='id'){this.id=v; byId[v]=this;}},
    getAttribute(k){return (k in this.attrs)?this.attrs[k]:null;},
    removeAttribute(k){delete this.attrs[k];},
    addEventListener(t,fn){(this._listeners[t]=this._listeners[t]||[]).push(fn);},
    removeEventListener(){},
    querySelector(sel){return qs(this, sel);},
    querySelectorAll(sel){return qsa(this, sel);},
    set innerHTML(v){this.children=[];this.childNodes=[];this._text=(v==='')?'':this._text;},
    get innerHTML(){return '';},
    set id(v){this._id=v; byId[v]=this;},
    get id(){return this._id;},
    focus(){}, blur(){}, scrollIntoView(){}, remove(){ if(this.parentNode)this.parentNode.removeChild(this); },
    click(){ if(this.onclick)this.onclick({preventDefault(){}}); },
  };
  // sync className <-> classList like a real element
  Object.defineProperty(e,'className',{
    get(){ return [...e.classList._s].join(' '); },
    set(v){ e.classList._s=new Set(String(v).split(/\s+/).filter(Boolean)); }
  });
  return e;
}
function mkText(s){return {nodeType:3, _text:String(s), textContent:String(s), parentNode:null, children:[], childNodes:[]};}
function walk(node, out){ if(!node) return; (node.childNodes||[]).forEach(c=>{ out.push(c); walk(c, out); }); }
function matches(el, sel){
  if(el.nodeType!==1) return false;
  if(sel.startsWith('#')) return el._id===sel.slice(1);
  if(sel.startsWith('.')) return el.classList.contains(sel.slice(1));
  return el._tag===sel;
}
function qs(root, sel){ const all=[]; walk(root, all); for(const n of all) if(matches(n,sel)) return n; return null; }
function qsa(root, sel){ const all=[]; walk(root, all); const r=all.filter(n=>matches(n,sel)); r.forEach=Array.prototype.forEach; return r; }

const documentEl = mkEl('html');
const body = mkEl('body');
const appDiv = mkEl('div'); appDiv.setAttribute('id','app');
const tabsNav = mkEl('nav'); tabsNav.setAttribute('id','tabs');
const toastDiv = mkEl('div'); toastDiv.setAttribute('id','toast');
const courseSel = mkEl('select'); courseSel.setAttribute('id','courseSel');
const themeBtn = mkEl('button'); themeBtn.setAttribute('id','themeBtn');
const dataScript = mkEl('script'); dataScript.setAttribute('id','course-data'); dataScript.textContent = data;
[appDiv,tabsNav,toastDiv,courseSel,themeBtn,dataScript].forEach(e=>body.append(e));

const localStore = {};
global.localStorage = { getItem:k=>k in localStore?localStore[k]:null, setItem:(k,v)=>{localStore[k]=String(v);}, removeItem:k=>{delete localStore[k];} };
global.document = {
  documentElement: documentEl,
  createElement: mkEl,
  createTextNode: mkText,
  createDocumentFragment: ()=>mkEl('#fragment'),
  querySelector: sel => (sel==='#app'?appDiv:sel==='#tabs'?tabsNav:sel==='#toast'?toastDiv:sel==='#courseSel'?courseSel:sel==='#themeBtn'?themeBtn:sel==='#course-data'?dataScript:(byId[sel.replace('#','')]||qs(body,sel))),
  addEventListener(){},
};
global.window = {
  matchMedia: ()=>({matches:false, addEventListener(){}, addListener(){}}),
  addEventListener(){}, scrollTo(){}, claude: undefined,
  setTimeout, clearTimeout, setInterval, clearInterval,
};
global.matchMedia = global.window.matchMedia;
global.scrollTo = ()=>{};
global.confirm = ()=>true;

// load & run the app
let html = fs.readFileSync(__dirname + '/index.build.html','utf8');
const idx = html.lastIndexOf('<script>');
let appjs = html.slice(idx+8, html.indexOf('</script>', idx));
appjs = appjs.replace(/"use strict";/, ''); // allow assigning globals in shim

let failures = [];
function trycall(label, fn){ try{ fn(); }catch(e){ failures.push(label+': '+e.message+'\n'+(e.stack||'').split('\n').slice(1,3).join('\n')); } }

// eval in a function scope that exposes needed globals
const runner = new Function('document','window','localStorage','matchMedia','scrollTo','confirm','setTimeout','clearTimeout','setInterval','clearInterval',
  appjs + '\nreturn {get state(){return state;}, renderTab, renderTabs, openDay, startQuiz, startExam, renderToday, renderDays, renderLabs, renderQuiz, renderExam, renderStats, questionCard, labCard, dailyIndexFor, course, boot};');
let api;
trycall('load/boot', ()=>{ api = runner(global.document, global.window, global.localStorage, global.matchMedia, global.scrollTo, global.confirm, setTimeout, clearTimeout, setInterval, clearInterval); });

if(api){
  const S = api.state;
  // render every tab
  ['today','days','quiz','labs','exam','stats'].forEach(t=>{
    trycall('renderTab('+t+')', ()=>{ S.tab=t; api.renderTabs(); api.renderTab(); });
  });
  // open several days of the current (default) course and answer questions
  const c = api.course();
  [c.days[0].day, c.days[Math.floor(c.days.length/2)].day, c.days[c.days.length-1].day].forEach(dn=>{
    trycall('openDay('+dn+')', ()=>api.openDay(dn));
  });
  // exercise a question card: build one of each type and simulate answering
  trycall('answer mcq', ()=>{
    const d=c.days.find(x=>x.questions.some(q=>q.type==='mcq'));
    const qi=d.questions.findIndex(q=>q.type==='mcq');
    const card=api.questionCard(d,d.questions[qi],qi);
    const opts=qs(card,'.opts');
    opts.children[0].onclick();      // click first option
    opts.children[0].onclick();      // double click (should no-op)
  });
  trycall('answer cmd', ()=>{
    const d=c.days.find(x=>x.questions.some(q=>q.type==='cmd'));
    const qi=d.questions.findIndex(q=>q.type==='cmd');
    const card=api.questionCard(d,d.questions[qi],qi);
    const btns=qsa(card,'.btn');
    // find the reveal button and click it
    const reveal=btns.find(b=>b._text&&b._text.indexOf('Show')>=0);
    reveal.onclick();
  });
  // labs render + mark done
  trycall('labCard mark', ()=>{
    const d=c.days.find(x=>x.labs.length);
    const card=api.labCard(d,d.labs[0],0);
    const mark=qsa(card,'.btn').find(b=>b._text&&/complet/i.test(b._text));
    if(mark)mark.onclick();
  });
  // quiz run
  trycall('quiz full run', ()=>{
    S.quizCfg={n:10,scope:'all'}; api.startQuiz();
    // answer through all 10 by clicking correct option / revealing
    for(let i=0;i<12;i++){
      if(!S.quizActive) break;             // reached result screen
      const opts=qs(appDiv,'.opts'); const inp=qs(appDiv,'.cmdin');
      if(opts){ const q=S.quiz.items[S.quiz.idx][1]; const btn=opts.children[q.answer]; if(btn)btn.onclick(); }
      else if(inp){ const btns=qsa(appDiv,'.btn'); const rev=btns.find(b=>/Show/.test(b._text)); if(rev)rev.onclick(); }
      const next=qsa(appDiv,'.btn').find(b=>/Skip|→/.test(b._text));
      if(next){ next.onclick(); } else break;
    }
    if(S.quizActive) throw new Error('quiz did not reach result after 12 steps');
  });
  // weak-spot quiz
  trycall('quiz weak', ()=>{ S.quizCfg={n:10,scope:'weak'}; api.startQuiz(); });
  // exam
  trycall('exam start+finish', ()=>{
    S.tab='exam'; api.renderTabs();
    api.startExam(8);
    // tick some checkboxes
    const boxes=qsa(appDiv,'input'); boxes.forEach((b,i)=>{ if(i%2===0){b.checked=true; if(b.onchange)b.onchange();} });
    const fin=qsa(appDiv,'.btn').find(b=>/Finish/.test(b._text)); if(fin)fin.onclick();
  });
  // exercise EVERY course: switch to it, render all tabs, run a command-drill quiz
  const courseIds = JSON.parse(data).courses.map(c=>c.id);
  courseIds.forEach(cid=>{
    trycall('switch->'+cid, ()=>{ courseSel.value=cid; if(courseSel.onchange)courseSel.onchange(); });
    ['today','days','quiz','labs','exam','stats'].forEach(t=>{
      trycall(cid+' renderTab('+t+')', ()=>{ S.tab=t; api.renderTabs(); api.renderTab(); });
    });
    // command-drill quiz for this course
    trycall(cid+' cmd-drill', ()=>{
      S.quizCfg={n:10,scope:'cmd'}; api.startQuiz();
      for(let i=0;i<12;i++){
        if(!S.quizActive) break;
        const inp=qs(appDiv,'.cmdin'); const opts=qs(appDiv,'.opts');
        if(inp){ const rev=qsa(appDiv,'.btn').find(b=>/Show/.test(b._text)); if(rev)rev.onclick(); }
        else if(opts){ const q=S.quiz.items[S.quiz.idx][1]; const b=opts.children[q.answer]; if(b)b.onclick(); }
        const next=qsa(appDiv,'.btn').find(b=>/Skip|→/.test(b._text));
        if(next)next.onclick(); else break;
      }
    });
    // open first, middle, last day of this course
    trycall(cid+' open days', ()=>{ const cc=api.course(); [cc.days[0].day, cc.days[cc.days.length-1].day].forEach(dn=>api.openDay(dn)); });
  });
  // theme toggle
  trycall('theme toggle', ()=>{ if(themeBtn.onclick)themeBtn.onclick(); if(themeBtn.onclick)themeBtn.onclick(); });
  // daily question pick determinism
  trycall('daily pick', ()=>{ const a=api.dailyIndexFor('2026-09-30').pick, b=api.dailyIndexFor('2026-09-30').pick; if(a[1]!==b[1]) throw new Error('daily not deterministic'); });
}

if(failures.length){ console.log('FAILURES ('+failures.length+'):'); failures.forEach(f=>console.log(' • '+f)); process.exit(1); }
else console.log('SMOKE OK — all tabs, days, question types, quiz, exam, theme and course-switch ran without errors.');
