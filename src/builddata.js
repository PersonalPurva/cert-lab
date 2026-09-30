// Assemble data.json: split RHCSA into RH124/RH134, attach theory, keep CompTIA courses.
const fs = require('fs');
const dir = __dirname + '/';
const rhAll = require('./rhcsa.json').concat(require('./adv.json')).concat(require('./adv2.json')).concat(require('./adv3.json'));
const sec = require('./secplus.json');
const pt = require('./pentest.json');
const loadTheory = f => fs.existsSync(dir+f) ? JSON.parse(fs.readFileSync(dir+f,'utf8')) : {};
const theory    = loadTheory('theory.json');      // RHCSA (RH124 days 1-21, RH134 days 22-40 & 51-68)
const theorySec = loadTheory('theory_sec.json');  // Security+ days 1-30
const theoryPt  = loadTheory('theory_pt.json');   // Pentest+ days 1-28

const rh124 = rhAll.filter(d=>d.course==='RH124');
const rh134 = rhAll.filter(d=>d.course==='RH134').concat(rhAll.filter(d=>d.course==='EX200'));

// attach theory keyed by each course's own day numbers (RHCSA before renumber)
function attach(days, map){ days.forEach(d=>{ const t=map[String(d.day)]; if(t) d.theory=t; }); }
attach(rh124, theory); attach(rh134, theory);
attach(sec, theorySec); attach(pt, theoryPt);

// renumber each course from 1
rh124.forEach((d,i)=>d.day=i+1);
rh134.forEach((d,i)=>d.day=i+1);

const data = { courses: [
  { id:'rh124', name:'RH124 — RHCSA I', exam:'Red Hat System Administration I · RHEL 10 (foundation for EX200)', short:'RH124', days:rh124 },
  { id:'rh134', name:'RH134 — RHCSA II', exam:'Red Hat System Administration II · RHEL 10 · storage, SELinux, containers, networking + EX200 review', short:'RH134', days:rh134 },
  { id:'secplus', name:'CompTIA Security+ (SY0-701)', exam:'CompTIA Security+ · SY0-701', short:'Security+', days:sec },
  { id:'pentest', name:'CompTIA Pentest+ (PT0-003)', exam:'CompTIA PenTest+ · PT0-003 · authorized testing only', short:'Pentest+', days:pt },
]};

// --- Spread the correct answer across A/B/C/D ---
// Source always lists the correct option first, so it always landed on A.
// Shuffle each MCQ's options with a per-question deterministic seed so the
// position is stable across devices/reloads (fair, and keeps progress consistent).
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function shuffleMCQ(q){
  if(q.type!=='mcq'||!q.options||q.options.length<2)return;
  const rnd=mulberry32(hashStr(q.q));
  const order=q.options.map((_,i)=>i);
  for(let i=order.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));const t=order[i];order[i]=order[j];order[j]=t;}
  q.options=order.map(i=>q.options[i]);
  q.answer=order.indexOf(q.answer);
}
const dist={};
data.courses.forEach(c=>c.days.forEach(d=>d.questions.forEach(q=>{ if(q.type==='mcq'){shuffleMCQ(q); dist[q.answer]=(dist[q.answer]||0)+1;} })));

fs.writeFileSync(dir+'data.json', JSON.stringify(data));
console.log('Answer-position spread (0=A,1=B,2=C,3=D):', JSON.stringify(dist));

console.log('data.json', (fs.statSync(dir+'data.json').size/1024).toFixed(0)+'KB');
data.courses.forEach(c=>{
  let q=0,l=0,th=0; c.days.forEach(d=>{q+=d.questions.length;l+=d.labs.length;if(d.theory)th++;});
  console.log('  '+c.short.padEnd(10)+': '+c.days.length+' days, '+q+' Q, '+l+' labs, '+th+' days with theory');
});
