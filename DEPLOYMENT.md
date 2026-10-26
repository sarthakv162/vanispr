# VaniSPR Deployment Guide (100% Free)

This guide explains how to deploy **VaniSPR** online so your friend **Aadya** can access her researcher console from anywhere on her system or phone, and study participants can take reading experiments remotely.

---

## 🎯 Recommended Deployment Architecture: Vercel (Frontend) + Render (Backend)

Both platforms have **permanent 100% free tiers** with free HTTPS/SSL certificates.

- **Frontend:** Hosted on **Vercel** (Global edge CDN, instant page loads).
- **Backend:** Hosted on **Render** (Free Python Web Service).

---

### Step 1: Push Your Code to GitHub

If you haven't pushed your latest code to GitHub yet:

```bash
git add .
git commit -m "feat: deployment ready with auth, mobile support, and clean telemetry"
git push origin main
```

---

### Step 2: Deploy the Backend on Render (Free)

1. Go to [render.com](https://render.com) and sign up / log in with your GitHub account.
2. Click **"New +"** in the top right and select **"Web Service"**.
3. Select your **`vanispr`** (or `aadyalangproj`) repository.
4. Configure the service settings:
   - **Name:** `vanispr-api` *(or your preferred name)*
   - **Region:** Choose the region closest to you (e.g., *Singapore* or *Frankfurt*).
   - **Branch:** `main`
   - **Root Directory:** Leave blank *(or `.`)*
   - **Runtime:** `Python 3`
   - **Build Command:**
     ```bash
     pip install -r requirements.txt
     ```
   - **Start Command:**
     ```bash
     uvicorn main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance Type:** Select **Free** ($0 / month).
5. Click **"Create Web Service"**.
6. Render will build and deploy the backend. Once finished, you will get a public URL:
   `https://vanispr-api.onrender.com`
7. Test it by opening `https://vanispr-api.onrender.com/api/health` in your browser. You should see:
   ```json
   {"status":"ok","platform":"VaniSPR","version":"1.0.0"}
   ```

---

### Step 3: Deploy the Frontend on Vercel (Free)

1. Go to [vercel.com](https://vercel.com) and log in with GitHub.
2. Click **"Add New..."** -> **"Project"**.
3. Import your **`vanispr`** repository.
4. In the project configuration:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click "Edit" and choose `frontend`.
   - **Build and Output Settings:** Leave default (`npm run build`, output `dist`).
5. **Environment Variables:**
   - Add one variable:
     - **Name:** `VITE_API_BASE_URL`
     - **Value:** Your Render backend URL from Step 2 (e.g., `https://vanispr-api.onrender.com`)
6. Click **"Deploy"**.
7. In ~30 seconds, Vercel will give you a public production URL (e.g., `https://vanispr.vercel.app`).

---

### Step 4: Login & Use

1. Open your Vercel URL in any browser:
   `https://vanispr.vercel.app`
2. Sign in with Aadya's credentials:
   - **Email:** `aadyagupta@gmail.com`
   - **Password:** `aadyasarthak1234`
3. Everything is now live!
   - Aadya can edit Hindi/English stimuli, view Latin-Square counterbalancing, inspect live telemetry, and analyze Residual Reading Times & ANOVA figures on her laptop or phone.
   - When she clicks **"Share Participant Link"**, the URL will automatically use the live domain:
     `https://vanispr.vercel.app/?exp=exp_hindi_sov_rel_2026&participant=true`
   - Participants who open this link go directly to the study without needing a login.

---

## ⚡ Alternative: 1-Click All-in-One Deployment on Render

If you prefer deploying only **ONE** service instead of two, VaniSPR's FastAPI backend is now configured to serve both the API and the pre-built React frontend:

1. In Render, create a **New Web Service** from your GitHub repo.
2. Set:
   - **Build Command:**
     ```bash
     pip install -r backend/requirements.txt && cd frontend && npm install && npm run build
     ```
   - **Start Command:**
     ```bash
     uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port $PORT
     ```
3. A single URL (e.g. `https://vanispr.onrender.com`) will host both the frontend website and backend API!
