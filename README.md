# Linux Cert Lab

A self-contained study app for three certifications, live at
**https://personalpurva.github.io/cert-lab/**

- **RH124 — RHCSA I** · **RH134 — RHCSA II** (Red Hat, RHEL 10)
- **CompTIA Security+ (SY0-701)**
- **CompTIA Pentest+ (PT0-003)** — authorized / lab testing only
- **OSINT & Digital Forensics** — a self-paced side track of 10 modules (no day schedule); lawful, public-source and own-data practice only

## What's inside

Each course is a day-by-day plan. Every day has:

- **📖 Theory & concepts** — beginner-first notes explaining every concept and walking through each command and its options.
- **Concept questions** (multiple choice) and **command drills** (type the real command, checked against every valid form) — every question has an explanation.
- **Hands-on labs** — scenario → try it on your VM → reveal steps → verify.
- **Timed exam** and **weak-spots quiz** modes.

Totals: ~126 days, ~1,130 questions, ~407 labs, ~386 theory sections.
Progress is saved per-browser (localStorage) — no account or server needed.

## Files

- `index.html` — the whole app, self-contained (this is what GitHub Pages serves). All content is inlined; there is no build step needed to *view* it.
- `src/` — the sources it's built from:
  - `bank*.txt`, `adv*.txt`, `sec*.txt`, `pt*.txt` — question/lab banks (one plain-text format, see below).
  - `theory*.txt` — the theory notes.
  - `index.html` — the app **template** (with a `/*__DATA__*/` marker where data is inlined).
  - `parse.js`, `parse_theory.js`, `builddata.js`, `build.js`, `smoke.js`, `make.sh` — the build pipeline.
  - `*.json` — generated intermediate data (rebuildable).

## Rebuilding after editing content

Edit the `.txt` files in `src/`, then from `src/`:

```bash
bash make.sh
```

This parses the banks and theory, assembles `data.json`, inlines it into the template, runs a headless smoke test, and writes the standalone `../index.html`. Commit and push to redeploy.

## Bank format (question/lab files)

```
#D 1|RH124|Day title|Exam objective sentence
Q Multiple-choice question text?
+ correct option (always written first; the build shuffles positions)
- wrong option
- wrong option
E Explanation shown after answering.
C Command-style question prompt.
A accepted answer
A another accepted form
E Explanation.
T Lab title
S Lab scenario.
H Optional hint.
X solution step (rendered as a terminal line)
V verify command
```

## Theory format (theory files)

```
#D 1
## Concept heading
Paragraph text (blank line separates paragraphs). Inline **bold** and `code`.
- bullet point
```
Theory is keyed per course by day number (`theory.json` = RHCSA, `theory_sec.json` = Security+, `theory_pt.json` = Pentest+, `theory_osint.json` = OSINT & Forensics).

A course object in `builddata.js` may set `unit:'Module'` to rename "Day" to "Module" throughout the app for that course, and `pace` to replace the plan blurb (used by the self-paced OSINT & Forensics track; bank `osint*.txt`, theory `theory_osint*.txt`).
