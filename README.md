# 🎸 RHYTHM MATES – Band Manager

A premium band booking management app with Google Sheets as the database, deployed on Vercel.

---

## 🗂️ Project Structure

```
/
├── index.html          ← Full single-page app (HTML + CSS + JS)
├── api/
│   └── bookings.js     ← Vercel serverless function (CRUD via Google Sheets)
├── package.json
├── vercel.json
├── .env.example        ← Template for environment variables
├── .gitignore
└── README.md
```

---

## ⚙️ Setup Guide

### Step 1 – Create the Google Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Name the first tab exactly: **`Bookings`**
3. Add these headers in **Row 1** (copy-paste exactly):

```
id	date	shift	env	client	phone	location	total	advance	balance	soundcheck	crowd	theme	notes
```

4. Copy the **Spreadsheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/**COPY_THIS_PART**/edit`

---

### Step 2 – Create a Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select an existing one)
3. Enable the **Google Sheets API**:
   - APIs & Services → Enable APIs → search "Google Sheets API" → Enable
4. Create a Service Account:
   - APIs & Services → Credentials → Create Credentials → Service Account
   - Give it any name (e.g. `rhythm-mates-sheets`)
   - No special roles needed → Done
5. Open the new service account → **Keys** tab → Add Key → Create new key → **JSON**
6. Download the JSON file — you'll need `client_email` and `private_key` from it

---

### Step 3 – Share the Sheet with the Service Account

1. Open your Google Sheet
2. Click **Share** (top right)
3. Paste the `client_email` from your JSON key (looks like `name@project.iam.gserviceaccount.com`)
4. Set permission to **Editor**
5. Click Send (ignore the "can't notify" warning)

---

### Step 4 – Set Environment Variables

#### For Local Development
Create a `.env.local` file in the project root:
```
GOOGLE_SHEET_ID=your-spreadsheet-id
GOOGLE_SA_EMAIL=name@project.iam.gserviceaccount.com
GOOGLE_SA_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
```

#### For Production (Vercel)
1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add each of the 3 variables above
3. For `GOOGLE_SA_PRIVATE_KEY`: paste the entire key value exactly from the JSON file

---

### Step 5 – Deploy to Vercel via GitHub

1. Push this folder to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit – RHYTHM MATES Band Manager"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) → **New Project** → Import from GitHub
3. Select your repo → Deploy
4. After deploy, go to **Settings → Environment Variables** and add your 3 variables
5. Redeploy (Vercel dashboard → Deployments → Redeploy)

---

### Step 6 – (Optional) Migrate Existing Data

If you have existing bookings stored in the browser (localStorage), open the app and click the **"Import from localStorage"** button that appears in the top bar when local data is detected. This will push all local bookings to Google Sheets in one go.

---

## 🔑 Environment Variables Reference

| Variable | Description |
|---|---|
| `GOOGLE_SHEET_ID` | The spreadsheet ID from the URL |
| `GOOGLE_SA_EMAIL` | Service account email address |
| `GOOGLE_SA_PRIVATE_KEY` | Full private key including `-----BEGIN/END-----` lines |

---

## 🧪 Local Testing

Install [Vercel CLI](https://vercel.com/cli):
```bash
npm install -g vercel
npm install
vercel dev
```
Then open `http://localhost:3000`.

---

## 🛡️ Security Notes

- Never commit `.env.local` or the service account JSON to git — it's in `.gitignore`
- The service account only has access to sheets you explicitly share with it
- WhatsApp confirmation state (sent/edited flags) stays in browser localStorage — it's per-device only
