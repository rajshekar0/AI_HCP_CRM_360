# AI_FIRST_CRM — Step-by-Step Local Setup

Use this as the clean rebuild checklist after extracting the project.

## 1. Folder name

Keep the root folder name exactly:

```text
AI_FIRST_CRM
```

Recommended Windows location:

```text
D:\AI_FIRST_CRM
```

## 2. Backend setup

Open PowerShell or Command Prompt:

```bat
cd /d D:\AI_FIRST_CRM\backend
python -m venv venv
venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env
python -m uvicorn app.main:app --reload
```

Backend URLs:

```text
http://127.0.0.1:8000
http://127.0.0.1:8000/docs
```

Default database uses SQLite, so the project can run immediately without PostgreSQL:

```env
DATABASE_URL=sqlite:///./ai_crm.db
```

To use PostgreSQL later, edit `backend/.env` and replace `DATABASE_URL`. If your password contains special characters like `@`, URL-encode it or change the password to avoid connection parsing errors.

## 3. Frontend setup

Open a second PowerShell or Command Prompt window:

```bat
cd /d D:\AI_FIRST_CRM\frontend
npm install
copy .env.example .env
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

## 4. Smoke test order

1. Open `http://127.0.0.1:8000/health` and confirm healthy backend.
2. Open `http://localhost:5173`.
3. Go to Leads and create a lead.
4. Go to Logs and use sample note, then log interaction.
5. Go to Dashboard and confirm stats update.
6. Go to AI chat and test:

```text
Create a lead for Dr Kumar email kumar@test.com phone 9876543210
```

```text
Log interaction: Doctor was interested in Product X and asked for samples
```

## 5. Git initialization after successful local run

Run from the root folder:

```bat
cd /d D:\AI_FIRST_CRM
git init
git add .
git commit -m "Restore AI First CRM project"
```

Do not commit these folders/files:

```text
backend/venv
backend/.env
frontend/node_modules
frontend/.env
frontend/dist
```
