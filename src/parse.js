const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
const lines = src.split(/\r?\n/);
const days = [];
let day = null, item = null, lab = null;

function pushItem() { if (item && day) { day.questions.push(item); item = null; } }
function pushLab() { if (lab && day) { day.labs.push(lab); lab = null; } }

for (const raw of lines) {
  if (raw === '' ) continue;
  const tag = raw[0];
  const rest = raw.slice(2);
  if (raw.startsWith('#D ')) {
    pushItem(); pushLab();
    const body = raw.slice(3);
    const [num, course, title, obj] = body.split('|');
    day = { day: +num, course, title, objective: obj || '', questions: [], labs: [] };
    days.push(day);
  } else if (tag === 'Q') {
    pushItem(); pushLab();
    item = { type: 'mcq', q: rest, options: [], answer: -1, explain: '' };
  } else if (tag === 'C') {
    pushItem(); pushLab();
    item = { type: 'cmd', q: rest, accept: [], explain: '' };
  } else if (tag === '+') {
    if (item && item.type === 'mcq') { item.answer = item.options.length; item.options.push(rest); }
  } else if (tag === '-') {
    if (item && item.type === 'mcq') item.options.push(rest);
  } else if (tag === 'A') {
    if (item && item.type === 'cmd') item.accept.push(rest);
  } else if (tag === 'E') {
    if (item) item.explain = rest;
  } else if (tag === 'T') {
    pushItem(); pushLab();
    lab = { title: rest, scenario: '', hints: [], steps: [], verify: [] };
  } else if (tag === 'S') {
    if (lab) lab.scenario = rest;
  } else if (tag === 'H') {
    if (lab) lab.hints.push(rest);
  } else if (tag === 'X') {
    if (lab) lab.steps.push(rest);
  } else if (tag === 'V') {
    if (lab) lab.verify.push(rest);
  }
}
pushItem(); pushLab();

// validation
let problems = [];
for (const d of days) {
  for (const q of d.questions) {
    if (q.type === 'mcq' && (q.answer < 0 || q.options.length < 2)) problems.push(`Day ${d.day}: bad mcq "${q.q}"`);
    if (q.type === 'cmd' && q.accept.length === 0) problems.push(`Day ${d.day}: cmd no answer "${q.q}"`);
    if (!q.explain) problems.push(`Day ${d.day}: no explain "${q.q}"`);
  }
  for (const l of d.labs) {
    if (!l.scenario) problems.push(`Day ${d.day}: lab no scenario "${l.title}"`);
    if (l.steps.length === 0) problems.push(`Day ${d.day}: lab no steps "${l.title}"`);
  }
}
const totalQ = days.reduce((s,d)=>s+d.questions.length,0);
const totalL = days.reduce((s,d)=>s+d.labs.length,0);
console.error(`Days: ${days.length}  Questions: ${totalQ}  Labs: ${totalL}`);
console.error(`Problems: ${problems.length}`);
problems.slice(0,40).forEach(p=>console.error('  '+p));
fs.writeFileSync(process.argv[3], JSON.stringify(days));
