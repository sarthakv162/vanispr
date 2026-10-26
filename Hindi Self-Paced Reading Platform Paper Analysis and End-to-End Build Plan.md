# Hindi Self-Paced Reading Platform: Paper Analysis and End-to-End Build Plan

Prepared for Sarthak Verma · 25 Oct 2026 · Based on Gibson & Warren (2004), *Syntax* 7:1, 55–78

## 1. Executive summary

You want a host-controlled website where a researcher (the host) adds sentences through a UI, shares a link, participants read sentences word by word with the spacebar, and every keypress time, answer and participant detail lands in a database ready for analysis. That is a well-defined product: a **self-paced reading (SPR) experiment platform with an admin console, a participant runner, a timing-accurate engine, and an analysis export**, with first-class Hindi (Devanagari) support.

My recommendation in one paragraph: build a **React (Vite) front end with a dedicated, framework-free timing engine**, a **FastAPI backend**, and **PostgreSQL (Supabase is fine)**. Ship an MVP that reproduces the Gibson & Warren procedure exactly (instructions, practice, masked word-by-word display, per-word reaction times, yes/no question with feedback, Latin-square lists), then layer on the admin sentence editor, counterbalancing, dashboards and analysis. This stack matches the tools you already use (FastAPI, PostgreSQL/Supabase, Python, JavaScript), so the learning curve is mostly the psychology-of-measurement, not the plumbing.

One thing to decide early: **the 2004 paper's English wh-extraction design does not transfer directly to Hindi.** Section 3 explains why, and the platform should be built experiment-agnostic so you can load whatever Hindi design you finalize.

## 2. In-depth analysis of the paper

### 2.1 The scientific question

Most syntactic theories since Chomsky (1973) claim that a long-distance dependency (for example, 'The manager **who** the consultant claimed that the new proposal had pleased \_\_\_') passes through **intermediate structure** in the embedded clause. English has no visible marker of this, so the authors look for behavioural evidence in reading times.

### 2.2 The logic of the design

Two hypotheses are combined:

1. **Intermediate structure hypothesis:** when a clause (VP condition) intervenes between the wh-filler *who* and its gap, intermediate structure mediates the link. When the clause is nominalized (NP condition: 'the consultant's claim about…'), no such structure is proposed.
2. **Dependency Locality Theory (Gibson 1998, 2000):** integrating a word takes longer the farther back (in new discourse referents) the element it connects to.

Combined prediction: at the verb *had pleased* (region 5), reading should be **faster in the clausal condition than in the nominalized condition**, because the filler-gap link is effectively more local.

### 2.3 Why four conditions, not two

The VP versus NP comparison alone is confounded: the subject-verb distance (*proposal* to *pleased* versus *claim* to *pleased*) also differs. So the authors add two **non-extracted controls** with the same subject-verb distances but no wh-filler. The real prediction is therefore an **interaction** (extraction × phrase type) at region 5, not just a main effect. This 2 × 2 logic is the single most important thing to preserve in your software: the platform must understand *conditions* and *factors*, not just a flat list of sentences.

| Condition | Example |
| --- | --- |
| +extract, VP | The manager who the consultant claimed that the new proposal had pleased will hire five workers tomorrow. |
| +extract, NP | The manager who the consultant's claim about the new proposal had pleased will hire five workers tomorrow. |
| –extract, VP | The consultant claimed that the new proposal had pleased the manager who will hire five workers tomorrow. |
| –extract, NP | The consultant's claim about the new proposal had pleased the manager who will hire five workers tomorrow. |

### 2.4 Materials and procedure (what your app must replicate)

- 98 native English speakers (MIT), paid.
- 20 experimental items × 4 conditions, plus 70 fillers (40 from unrelated experiments); yes/no comprehension question for every item.
- **Four 90-item lists** (Latin square): every item appears in exactly one condition per list, each list has equal items per condition, and each participant sees **one list in a different pseudo-random order**.
- Verb constraints: bridge verbs strongly biased toward sentence complements, animate relativized noun, so participants would not wrongly posit an object gap after the bridge verb.
- **Plausibility norming:** a separate group of 28 participants rated simplified non-extracted versions on a 1 (natural) to 7 (unnatural) scale. Five of 20 items differed significantly between versions and were dropped, leaving 15.
- **Procedure:** noncumulative moving-window SPR. Spacebar reveals the next word and turns all other words back into dashes. After each sentence, a yes/no question; wrong answers produce an on-screen message. Two instruction screens and eight practice trials; about 20 minutes.

### 2.5 Analysis pipeline

- Sentences split into **seven regions** (Table 1 in the paper). Region 5 (*had pleased*) is critical; region 6 captures spillover.
- **Residual reading times:** for each participant, a regression of reading time on word length across all filler and experimental items; residual = actual minus predicted. Residuals above 3000 ms were excluded (under 0.5% of data).
- Participants below 75% accuracy on 30 designated filler questions were excluded (6 of 98, leaving 92).
- Statistics: repeated-measures ANOVAs by participants (F1) and by items (F2).

### 2.6 Results in brief

At region 5 the predicted interaction was significant (F1(1,91)=4.36, p<.05; F2(1,14)=5.17, p<.05). Residual RTs at the critical region (Appendix B): +extract VP 63.6 ms, +extract NP 138.5 ms, –extract VP 7.7 ms, –extract NP 22.3 ms in the table. Comprehension accuracy: 80% and 73% (extracted VP and NP) versus 90% and 88% (non-extracted).

*Note:* an earlier summary in this conversation listed the –extract NP residual as –3.2 ms. The appendix table is garbled in extraction; the text shows 22.3 for that cell, so treat exact values for that condition as **needing a check against the original PDF page 78** before you cite them.

### 2.7 Strengths and limitations you should design around

- **Strength:** clever control conditions; norming survey; matched lists; counterbalancing; analysis by both participants and items.
- **Region 3 (*that* / *about*):** a marginal reverse interaction that the authors themselves caution may be a local ambiguity effect, not evidence for the hypothesis.
- **Critical effect is modest** (p<.05) and depends on residualization; the authors note not all critical tests were significant on raw RTs.
- **Spillover:** region 6 shows a similar pattern; SPR effects often land one word late, so your data model must store **every word's RT**, not only the critical region.
- **Dropped items:** 25% of items were removed after the fact for plausibility, which shows why norming tooling belongs in the platform.
- **Timing hardware:** a Macintosh Centris in 2004. In a browser you inherit keyboard, OS and display latency variance, which is the main technical risk (Section 8).

## 3. Hindi-specific considerations

### 3.1 The experiment will not port one-to-one

Hindi is head-final (SOV) with postpositions (*ne, ko, se, mein*), scrambling, and relative-correlative clauses ('jo … vo …'). The English design depends on a fronted wh-filler waiting for a verb and a *that* clause intervening, which has no direct Hindi equivalent. Hindi psycholinguistics has its own locality and expectation literature (for example work by Vasishth, Husain and colleagues on argument-head distance and expectation in Hindi); I have not re-verified those citations in this session, so look them up before you design stimuli. The practical point: **your platform should be experiment-agnostic**, with Gibson & Warren as the first reference template for testing the pipeline (you can even pilot with the English items).

### 3.2 Technical Hindi issues

| Issue | Recommendation |
| --- | --- |
| Rendering | Self-host **Noto Sans Devanagari** (or Mukta); never rely on system fonts. Test conjuncts such as क्ष, ज्ञ, श्र and matras. |
| Segmentation | Split on whitespace; **never split by code point**. Use `Intl.Segmenter` with granularity grapheme only for display-width logic. |
| Postpositions | Written separately in Hindi (राम ने), so word-by-word gives them their own region. Let the host define **regions** (word groups) explicitly, as the paper did with 'had pleased'. |
| Masking | Dashes should match the *visual* width of each word: use one dash per grapheme cluster, or a fixed-width placeholder, and keep layout stable so the sentence does not shift. |
| Word length covariate | Residualization needs a length measure. Store **grapheme count** (and optionally syllable count), not `string.length`. |
| Punctuation | The danda (।) attaches to the last word; keep it inside the final region. |
| Normalization | Store text as Unicode NFC; reject mixed ZWJ/ZWNJ surprises with an admin-side validator. |
| Romanized Hindi | Optional later; treat it as a separate language setting with its own font and length rule. |
| Keyboard | The spacebar is script-independent, which is the good news. Yes/no keys should be labelled in Hindi (हाँ / नहीं) but bound to neutral keys such as F and J. |

## 4. Product vision and users

**Host (researcher/admin):** creates experiments, writes or imports stimuli, defines conditions and regions, previews, publishes a link, watches live progress, exports data.

**Participant:** opens a link on a laptop, consents, fills a short background form, reads instructions, does practice, runs the experiment, sees a thank-you/completion code.

**Analyst (often the host):** downloads tidy CSV or runs built-in analysis notebooks.

## 5. Feature ideation

### 5.1 MVP (must-have)

1. **Host login** and an experiment list.
2. **Sentence editor in the UI:** add, edit, delete items; each item has per-condition text, region boundaries, a yes/no question and the correct answer; mark each item as experimental or filler.
3. **Bulk import** from CSV (columns: item\_id, condition, sentence, question, answer, type) with a validator that flags Unicode and region problems.
4. **Live preview** of exactly how a trial will look (same engine as the real run).
5. **Participant runner:** consent, instructions, 8 practice trials, noncumulative moving-window display, spacebar advance, yes/no question, wrong-answer message, end screen.
6. **Per-word RT logging** with timestamps stored in the database.
7. **Latin-square list assignment** and per-participant pseudo-random order.
8. **CSV export** (long format: one row per word per trial).

### 5.2 Version 1

- **Experiment templates:** 'Gibson & Warren 2×2' template as a one-click starter.
- **Factor builder:** define factors and levels (extraction: +/–, type: VP/NP); the system generates conditions, validates that every item has every condition, and builds the Latin-square lists automatically.
- **Region editor:** click between words to define regions visually.
- **Pseudo-randomization rules:** no two items of the same condition back to back, fillers interleaved, minimum fillers between experimental items.
- **Norming module:** a separate rating survey (1 to 7 plausibility) using the same item bank, with per-item t-tests so you can exclude items just as the authors did.
- **Participant management:** shareable link with optional **Prolific/MTurk/Sona** parameters (PROLIFIC\_PID), completion codes, quotas per list so lists fill evenly.
- **Attention and quality checks:** accuracy threshold on fillers (the paper used 75%), too-fast and too-slow trial flags, tab-switch detection.
- **Live dashboard:** participants started/completed, list balance, mean accuracy, RT distribution by position.
- **Instruction editor** in Hindi and English with versioning.
- **Timing self-test:** a 30-second calibration before the task that measures display refresh rate and keypress timestamp jitter, stored with the participant.

### 5.3 Version 2 (stretch)

- Built-in **analysis page:** residual RTs, per-region plots like the paper's Figure 1, condition means with error bars, interaction tests.
- **Mixed-effects export** scripts (R `lme4` or Python `statsmodels`) generated from the experiment definition.
- Other paradigms through the same engine: **cumulative moving window**, **centered/RSVP presentation**, **maze task**, **acceptability judgment**.
- **Eye-tracking-free proxies:** mouse-tracking reading (a lower-latency alternative) as an optional mode.
- **Multi-host teams**, role permissions, audit log of stimulus changes.
- **Replication package export:** stimuli, lists, code version and raw data zipped with a README, supporting open science.
- Pre-registration helper that freezes exclusion rules before data collection.

## 6. Architecture and tech stack

```
Participant browser                     Host browser
  React runner (UI)                       React admin console
  Timing engine (vanilla JS)              (stimuli, lists, dashboard)
        |                                        |
        +---------------- HTTPS -----------------+
                         |
                  FastAPI backend
   (auth, experiments, lists, sessions, ingest, export)
                         |
                  PostgreSQL (Supabase)
                         |
          Analysis worker / notebooks (Python, R)
```

| Layer | Choice | Why |
| --- | --- | --- |
| Front end | React + Vite + TypeScript | Fast UI; you already know JS. |
| Timing engine | Plain TypeScript module, no React inside | Rendering frameworks add latency and jitter; isolate the hot path. |
| Styling | Tailwind or plain CSS with self-hosted Noto Sans Devanagari | Predictable fonts. |
| Backend | FastAPI (Python) | Your existing skill; easy pandas/statsmodels integration. |
| Database | PostgreSQL via Supabase (auth, row-level security, backups) | Relational data suits experiments. |
| Auth | Supabase Auth for hosts; participants use anonymous UUID sessions | Hosts need accounts; participants should not. |
| Hosting | Vercel/Netlify for the front end; Render/Fly/Railway for the API | Cheap, simple. |
| Analysis | Python (pandas, statsmodels) plus optional R | Lets you replicate the paper's pipeline. |
| Testing | Playwright for flows; synthetic participants for load tests | Catches regressions. |

If you prefer fewer moving parts, you could call Supabase directly from the front end and skip FastAPI for the MVP, then add FastAPI when you need analysis endpoints. I would still keep FastAPI because the analysis and export logic belongs on the server.

## 7. Data model

| Table | Key columns |
| --- | --- |
| hosts | id, email, created\_at |
| experiments | id, host\_id, title, language, status (draft/live/closed), design\_json, instructions\_json, version |
| factors | id, experiment\_id, name, levels\[\] |
| items | id, experiment\_id, item\_number, type (experimental/filler/practice), question, correct\_answer |
| item\_versions | id, item\_id, condition\_label, sentence\_text (NFC), regions\_json, word\_count |
| lists | id, experiment\_id, list\_number |
| list\_items | list\_id, item\_version\_id, order\_hint |
| participants | id (uuid), experiment\_id, list\_id, external\_id (Prolific), consent\_at, user\_agent, screen\_w/h, refresh\_rate\_est, background\_json |
| trials | id, participant\_id, item\_version\_id, presentation\_order, started\_at, question\_response, correct, question\_rt\_ms |
| word\_events | id, trial\_id, word\_index, region\_index, word\_text, rt\_ms, t\_shown, t\_pressed, grapheme\_count |
| quality\_flags | participant\_id, flag, detail |
| norming\_ratings | id, rater\_id, item\_version\_id, rating |

Two design rules matter: keep **raw timestamps** (shown and pressed times) alongside computed RT so you can recompute later, and **freeze a snapshot of the stimuli** when an experiment goes live so edits never corrupt collected data (the `version` column).

## 8. The timing engine (the hard part)

- Use `event.timeStamp` from the `keydown` event and `performance.now()`; do not use `Date.now()` or setTimeout for measurement.
- Show the next word, then record the time **after the browser has actually painted**: set the DOM in a handler, then in `requestAnimationFrame` (double rAF) record `t_shown`. RT for word *n* is `t_pressed(n) − t_shown(n)`, stored with the raw values.
- Ignore **key repeat** (`event.repeat`), accidental double presses (under \~80 ms) and keys other than space; flag them but log them.
- Detect `visibilitychange` and `blur`; flag trials where focus was lost.
- Preload fonts (`document.fonts.ready`) before the first trial; a late font swap would change layout mid-trial.
- Send data in batches **after each trial** (not per word) so network latency never interrupts reading; queue offline and retry; store a local backup in IndexedDB.
- Require a desktop/laptop with a physical keyboard; block touch devices on entry.
- Run the 30-second calibration and store estimated refresh rate and keypress jitter, so you can filter or model noisy sessions later.

Minimal core logic:

```ts
async function runTrial(words: string[], render: (i:number)=>void) {
  const events = [];
  for (let i = 0; i < words.length; i++) {
    render(i);                       // show word i, dash the rest
    const tShown = await nextPaint(); // resolves after rAF twice
    const tPressed = await waitForSpace(); // keydown.timeStamp
    events.push({ i, tShown, tPressed, rt: tPressed - tShown });
  }
  return events;
}
```

Browser timing is good enough for effects of tens of milliseconds when you have many participants and trials, but it is **not** lab-grade. State this in any write-up, and consider validating your engine against an established tool (PCIbex or jsPsych) on the same stimuli.

## 9. End-to-end flows

**Host flow:** sign in → create experiment → choose language and template → add factors and levels → add items (UI or CSV) → define regions → add fillers, questions, practice items → preview → run norming survey (optional) → generate lists → publish (freezes version) → share link → monitor → close → export.

**Participant flow:** open link → device check → consent → background questionnaire (age range, Hindi proficiency and language history) → instructions → timing calibration → 8 practice trials with feedback → main experiment with optional breaks → debrief → completion code.

**Assignment logic:** on start, the server picks the list with the fewest completed sessions, creates the participant, builds the pseudo-random order under your constraints, and returns the trial sequence. Incomplete sessions time out and release their slot.

## 10. Analysis pipeline

1. Export long-format data (participant, item, condition, region, word, rt, grapheme\_count, correct).
2. Remove practice trials; apply the pre-set exclusions (accuracy threshold on fillers, residual RT trimming, flagged sessions).
3. Per participant, fit RT \~ word length across all non-practice words; compute residuals (the paper's method).
4. Aggregate to regions; run the 2 × 2 interaction at the critical region and the next one for spillover.
5. Prefer **linear mixed-effects models** with random effects for participants and items (modern standard) in addition to or instead of F1/F2 ANOVAs.
6. Plot residual RT by region and condition with error bars (the equivalent of Figure 1).

## 11. Implementation plan

| Phase | Duration | Deliverables |
| --- | --- | --- |
| 0. Design | 1 week | Finalize Hindi experiment goals; read the Hindi literature; decide stimuli format; wireframes; confirm stack. |
| 1. Engine prototype | 1 to 2 weeks | Standalone page: Devanagari rendering, masking, spacebar loop, logging to console and JSON; run on 3 browsers and 3 laptops; measure jitter. |
| 2. Backend and DB | 1 week | Schema, FastAPI endpoints (sessions, trials, word events), Supabase setup, migrations. |
| 3. Participant runner | 1 to 2 weeks | Consent, instructions, practice, main task, questions, feedback, completion screen, batch upload. |
| 4. Host console MVP | 2 weeks | Auth, experiment CRUD, sentence editor, CSV import and validator, preview, publish. |
| 5. Design layer | 1 to 2 weeks | Factors, conditions, Latin square, pseudo-randomization, list balancing. |
| 6. Quality and dashboard | 1 week | Flags, calibration, live dashboard, export. |
| 7. Pilot | 1 to 2 weeks | 10 to 15 pilot participants; inspect RT distributions; fix issues. |
| 8. Analysis and norming | 2 weeks | Analysis notebook, norming survey, plots. |
| 9. Hardening | 1 week | Security, backups, load test, accessibility, documentation. |

Realistic total for a solo builder alongside classes: roughly **10 to 14 weeks** for v1; the MVP (phases 1 to 4) is about 5 to 7 weeks.

## 12. Risks, ethics and quality

- **Measurement validity:** browser timing noise; mitigate with calibration, many trials and mixed models.
- **Stimulus validity:** software cannot fix a poorly controlled design; add norming and frequency/length controls, and get a psycholinguist to review the Hindi stimuli.
- **Ethics:** if collecting data from people for research, get institutional ethics approval; show a consent page, collect minimal personal data, allow withdrawal, and keep participant IDs anonymous.
- **Privacy:** no names in the database; hash IPs or do not store them; document retention; HTTPS only.
- **Data loss:** per-trial batching, retry queue, local backup, nightly database backups.
- **Scope creep:** resist adding new paradigms before the SPR pipeline is validated.
- **Platform alternative:** if you only need results, PCIbex or jsPsych will get you there faster; build your own because you want the host UI, database and ownership, which is a perfectly good reason.

## 13. Suggested first steps this week

1. Build the **Phase 1 prototype** in a single HTML page with five Hindi sentences and log per-word RTs.
2. Reproduce the **English Gibson & Warren items** (Appendix A) in the prototype as a regression test for the engine.
3. Decide your first **Hindi research question** and write 10 sentences for one 2 × 2 design.
4. Sketch the host UI screens: experiment list, item editor, region editor, list preview, dashboard.
5. Check page 78 of the PDF for the exact Appendix B numbers before quoting them.

If you tell me your target Hindi phenomenon and whether this is for coursework, a research group or a product, I can turn this into a detailed backlog, a database migration script, or the working timing-engine prototype next.
