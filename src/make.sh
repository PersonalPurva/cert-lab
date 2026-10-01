#!/bin/bash
# Rebuild the whole Cert Lab app from source, into ../index.html (the deployed page).
# Requires: node. Run from the src/ directory:  bash make.sh
set -e
cd "$(dirname "$0")"

echo "1/5  parsing question banks..."
cat bank1.txt bank2.txt bank2b.txt bank3.txt bank4.txt bank5.txt > _rhcsa.txt
node parse.js _rhcsa.txt rhcsa.json
node parse.js adv1.txt adv.json
node parse.js adv2.txt adv2.json
node parse.js adv3.txt adv3.json
cat sec1.txt sec2.txt sec3.txt sec4.txt sec5.txt > _sec.txt
node parse.js _sec.txt secplus.json
cat pt1.txt pt2.txt pt3.txt > _pt.txt
node parse.js _pt.txt pentest.json
node parse.js class_bank.txt class.json

echo "2/5  parsing theory notes..."
node parse_theory.js theory.json     theory1.txt theory2.txt theory3.txt \
  theory_rh134_a.txt theory_rh134_b.txt theory_rh134_c.txt \
  theory_rh134_d.txt theory_rh134_e.txt theory_rh134_f.txt
node parse_theory.js theory_sec.json theory_sec1.txt theory_sec2.txt theory_sec3.txt theory_sec4.txt
node parse_theory.js theory_pt.json  theory_pt1.txt theory_pt2.txt theory_pt3.txt theory_pt4.txt
node parse_theory.js theory_class.json theory_class1.txt

echo "3/5  assembling data.json (split RHCSA, attach theory, shuffle answers)..."
node builddata.js

echo "4/5  inlining data into the app (index.build.html)..."
node build.js

echo "5/5  headless smoke test..."
node smoke.js

# wrap the built page as a standalone HTML file for GitHub Pages -> ../index.html
node -e '
const fs=require("fs");let c=fs.readFileSync("index.build.html","utf8");
const idx=c.indexOf("<header class=\"top\">");
const out=`<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${c.slice(0,idx)}</head>\n<body>\n${c.slice(idx)}\n</body>\n</html>\n`;
fs.writeFileSync("../index.html",out);
console.log("wrote ../index.html", (out.length/1024).toFixed(0)+"KB");
'
rm -f _rhcsa.txt _sec.txt _pt.txt
echo "done."
