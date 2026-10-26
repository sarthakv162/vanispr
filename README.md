# VaniSPR (वाणीSPR) · Psycholinguistic Self-Paced Reading Research Suite

<p align="center">
  <strong>A research-grade Self-Paced Reading (SPR) platform with native Hindi (Devanagari) & English support, Latin-Square counterbalancing, sub-millisecond browser timing engine, and psycholinguistic statistical pipelines.</strong>
</p>

---

## 🌟 Overview & Scientific Background

**VaniSPR** (rooted in *Vāṇī* [वाणी - speech/language] + *SPR* [Self-Paced Reading]) is a specialized, open-science web platform designed for experimental linguists, cognitive scientists, and psycholinguists. 

It replicates and extends the moving-window paradigm formalized by **Gibson & Warren (2004)** (*Reading-Time Evidence for Intermediate Linguistic Structure in Long-Distance Dependencies*, *Syntax* 7:1, 55–78) and adapts it with first-class support for head-final (SOV) languages like **Hindi**.

### Key Capabilities
- **Double-rAF Hardware Synchronization:** High-precision noncumulative moving-window timing engine decoupled from React render loops to record true keypress reaction times ($t_{pressed} - t_{shown}$).
- **First-Class Devanagari Segmentation:** True grapheme-cluster awareness via `Intl.Segmenter` preserving matras, halants, viramas, and complex conjuncts (e.g., *क्ष, ज्ञ, श्र*).
- **Latin-Square Counterbalancing:** Automated $N \times N$ orthogonal condition rotation ensuring every participant reads items in balanced conditions without consecutive duplicate conditions.
- **Plausibility Norming Module:** Pre-testing 1–7 acceptability rating portal to identify and exclude plausibility confounds before running SPR sessions.
- **Publication-Ready Analysis:** Automated participant filtering ($<75\%$ filler accuracy cutoff), residual reading time regressions on word length (graphemes), 2×2 Repeated Measures ANOVA ($F_1$ subjects, $F_2$ items), and automated script generators for **R (`lme4`)** and **Python (`statsmodels`)**.

---

## 🚀 Quick Start for Researchers (Non-Coders)

Your researcher friend does **not** need coding experience to run VaniSPR on her machine.

### Method 1: The All-In-One Launcher (Recommended)

From the project folder, simply run:

```bash
# On Linux / macOS:
./start.sh

# Or on Windows / any operating system with Python:
python start.py
```

This single command automatically:
1. Starts the background database and API server on `http://127.0.0.1:8000`.
2. Starts the frontend on `http://localhost:5173`.
3. Opens the researcher console directly in the default web browser.

---

### Method 2: Manual Two-Terminal Start

If you prefer running servers individually:

#### Terminal 1 (Backend):
```bash
source .venv/bin/activate
python backend/run.py
```
*Backend API:* `http://127.0.0.1:8000` | *API Documentation:* `http://127.0.0.1:8000/docs`

#### Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```
*Researcher Console:* `http://localhost:5173`

---

## 👥 How to Use with Participants

VaniSPR is architected with complete isolation between researchers and participants:

### 1. Generating a Participant Link
1. In the **Researcher Console**, navigate to your study on the Dashboard.
2. Click **"Share Participant Link"** (or copy from the link banner).
3. The link looks like:
   ```
   http://localhost:5173/?exp=exp_hindi_sov_rel_2026&participant=true
   ```

### 2. Distributing to Participants (Prolific / MTurk / WhatsApp / Email)
* When participants click this link, **they never see the researcher console, code, or other studies**.
* The app automatically boots directly into the **Participant Runner**.
* Mobile touchscreens are automatically detected and blocked with a friendly prompt requiring a physical keyboard (laptop/desktop) for sub-millisecond measurement accuracy.
* Participants progress through:
  1. **Consent Form** (Hindi or English).
  2. **Demographics Questionnaire** (Native language, Hindi proficiency, Prolific ID).
  3. **Display Calibration** (Refresh rate Hz estimation & frame jitter check).
  4. **Instructions** (Interactive moving-window demo).
  5. **Practice Trials** (with immediate feedback on incorrect comprehension answers).
  6. **Main Experiment** (Masked sentences with spacebar advance, yes/no comprehension questions).
  7. **Midpoint Rest Break** (To avoid eye strain).
  8. **Debriefing & Completion Code** (e.g. `SPR-8B94E1A2` for Prolific/MTurk verification).

### Prolific / MTurk URL Parameter Support
You can append Prolific URL query parameters directly:
```
http://your-domain.com/?exp=exp_hindi_sov_rel_2026&participant=true&PROLIFIC_PID={{%PROLIFIC_PID%}}
```
VaniSPR automatically captures the `PROLIFIC_PID` and tags all word reaction time records with that ID.

---

## 📊 Researcher Console Features

1. **Telemetry & Dashboard:** Live enrollment counts, completion percentages, Latin-Square list distribution balance, and attention-check filtering.
2. **Stimulus & Region Editor:** Visual word grouping tool ("Merge ←" and "Split") to create custom multi-word regions (e.g., grouping Hindi postpositions *राम ने*).
3. **Latin-Square Matrices:** Full visualization of condition rotation across lists (List 1 through List 4).
4. **Analysis & Figure 1:** Real-time generation of Residual Reading Times by region replicating Gibson & Warren (2004) Figure 1, with error bars ($\pm 1$ SEM) and 2×2 Repeated-Measures ANOVA.
5. **Plausibility Norming:** Independent 1–7 rating portal to pre-screen stimuli.
6. **Bulk CSV Importer:** One-click bulk ingestion of 20–100 items from Excel/Google Sheets.

---

## 📦 How to Push to GitHub

To maintain and back up your project on GitHub:

```bash
# 1. Initialize Git repository
git init

# 2. Add all project files (.gitignore will protect .venv and node_modules)
git add .

# 3. Create initial commit
git commit -m "feat: initial commit of VaniSPR psycholinguistic research suite"

# 4. Link to your GitHub repository (replace with your repo URL)
git branch -M main
git remote add origin https://github.com/<your-username>/vanispr.git

# 5. Push code
git push -u origin main
```

---

## ☁️ Deployment Strategy for Remote Studies

When ready to host online for distant participants:

| Service | Component | Configuration |
| :--- | :--- | :--- |
| **Render / Railway** | FastAPI Backend | Python environment running `uvicorn app.main:app --host 0.0.0.0 --port $PORT` with SQLite file or connected Supabase PostgreSQL. |
| **Vercel / Netlify** | React Frontend | Static build using `npm run build`, pointing API proxy or `VITE_API_BASE_URL` to your backend URL. |

---

## 📜 Citation & Credits
Based on the methodology in:
> Gibson, E., & Warren, T. (2004). *Reading-time evidence for intermediate linguistic structure in long-distance dependencies.* **Syntax**, 7(1), 55–78.
