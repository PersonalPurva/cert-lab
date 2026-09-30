const fs = require('fs');
const h = fs.readFileSync(__dirname + '/index.build.html', 'utf8');
const open = '<script id="course-data" type="application/json">';
const s = h.indexOf(open);
if (s < 0) { console.log('OPEN TAG NOT FOUND'); process.exit(1); }
const start = s + open.length;
const end = h.indexOf('</script>', start);
const body = h.slice(start, end);           // what the browser's textContent yields
console.log('extracted body length:', body.length);
console.log('starts:', JSON.stringify(body.slice(0, 40)));
console.log('ends  :', JSON.stringify(body.slice(-40)));
try {
  const p = JSON.parse(body);
  const c = p.courses[0];
  console.log('PARSE OK — courses:', p.courses.length,
    '| days:', c.days.length,
    '| Q:', c.days.reduce((a, d) => a + d.questions.length, 0),
    '| labs:', c.days.reduce((a, d) => a + d.labs.length, 0));
} catch (e) {
  console.log('PARSE FAIL:', e.message);
  const m = e.message.match(/position (\d+)/);
  if (m) console.log('context:', JSON.stringify(body.slice(+m[1] - 30, +m[1] + 10)));
}
