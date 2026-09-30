// Parse theory bank files into { "<dayNum>": [ {h, blocks:[{t:'p'|'li', x}]} ] }
// Format:
//   #D N            -> start day N
//   ## Heading      -> new concept section
//   - bullet text   -> list item in current section
//   (blank line)    -> paragraph break
//   any other text  -> paragraph text (consecutive lines join with a space)
const fs = require('fs');
const out = {};
let day = null, sec = null, para = '';

function flushPara(){ if(para.trim() && sec){ sec.blocks.push({t:'p', x:para.trim()}); } para=''; }
function flushSec(){ flushPara(); if(sec && day){ out[day].push(sec); } sec=null; }

for (const file of process.argv.slice(3)) {
  const lines = fs.readFileSync(file,'utf8').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.replace(/\s+$/,'');
    if (line.startsWith('#D ')) {
      flushSec(); day = line.slice(3).trim(); if(!out[day]) out[day]=[];
    } else if (line.startsWith('## ')) {
      flushSec(); sec = { h: line.slice(3).trim(), blocks: [] };
    } else if (line.startsWith('- ')) {
      flushPara(); if(sec) sec.blocks.push({t:'li', x: line.slice(2).trim()});
    } else if (line.trim()==='') {
      flushPara();
    } else {
      para = para ? para + ' ' + line.trim() : line.trim();
    }
  }
  flushSec();
}
// validation
let days=0, secs=0, problems=[];
for (const d in out){ days++; secs+=out[d].length;
  if(out[d].length===0) problems.push('Day '+d+' has no theory sections');
  out[d].forEach(s=>{ if(!s.blocks.length) problems.push('Day '+d+' section "'+s.h+'" empty'); });
}
console.error('Theory days:', days, '| sections:', secs, '| problems:', problems.length);
problems.slice(0,20).forEach(p=>console.error('  '+p));
fs.writeFileSync(process.argv[2], JSON.stringify(out));
