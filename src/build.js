const fs = require('fs');
const dir = __dirname + '/';
let html = fs.readFileSync(dir+'index.html','utf8');
const data = fs.readFileSync(dir+'data.json','utf8');
// Safe-embed inside <script type="application/json">: neutralize sequences that could
// terminate the script element or start an HTML comment.
const safe = data.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
if (!html.includes('/*__DATA__*/')) { console.error('marker missing'); process.exit(1); }
html = html.replace('/*__DATA__*/', () => safe); // function form: no $-pattern interpretation
fs.writeFileSync(dir+'index.build.html', html);
console.log('built index.build.html', (fs.statSync(dir+'index.build.html').size/1024).toFixed(0)+'KB');
