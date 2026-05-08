# AI_FIRST_CRM — HCP Interaction Intelligence System

A full-stack AI-first CRM prototype for Healthcare Professional (HCP) interaction logging, built for a technical assignment round.

## Features

- React + Tailwind SaaS UI
- Dark / light mode
- Dashboard with live stats, charts, bulletin feed, and AI insights
- Lead management: create, edit, delete, status update
- AI Assistant with chat history, voice input, smart prompts, copy message
- Interaction logging page with AI summary, sentiment, search, filter, follow-up suggestions
- FastAPI backend
- PostgreSQL or SQLite database support
- LangGraph AI workflow
- Groq LLM integration with fallback behavior

## LangGraph Tools / Actions

1. Create Lead
2. Log Interaction
3. Edit Interaction
4. Suggest Follow-ups
5. Summarize / Extract Entities

## Backend Setup

Project root folder should be named `AI_FIRST_CRM`.

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python -m uvicorn app.main:app --reload
```

Edit `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:your_postgres_password@localhost:5432/ai_first_crm
GROQ_API_KEY=your_groq_key_here
GROQ_MODEL=llama-3.1-8b-instant
FRONTEND_URLS=http://localhost:5173,http://127.0.0.1:5173
```



Backend runs at:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

## Frontend Setup

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

## Demo Flow

1. Open dashboard.
2. Show zero/fresh CRM state.
3. Create lead from AI Assistant.
4. Verify lead in Leads page.
5. Log HCP interaction from Interactions page.
6. Show AI summary and sentiment.
7. Ask AI Assistant for follow-up suggestions.
8. Show Dashboard stats update.

## Deployment Plan

- Backend: Render
- Frontend: Vercel
- Database: Supabase or Render PostgreSQL
- Secrets: environment variables only

