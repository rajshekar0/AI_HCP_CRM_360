# AI HCP-CRM 360

**AI HCP-CRM 360** is an AI-powered Customer Relationship Management platform built for Healthcare Professional (HCP) engagement. It helps manage HCP leads, log field interactions, generate AI summaries, detect sentiment, suggest follow-ups, and visualize CRM performance through a modern analytics dashboard.

The project is designed as a full-stack SaaS-style CRM application for life sciences, pharma, healthcare field teams, and medical representative workflows.

---

## Project Overview

AI HCP-CRM 360 provides a complete 360-degree workspace for managing HCP relationships. The platform combines traditional CRM capabilities with an AI Copilot powered by LangGraph and Groq LLM.

The application supports:

* HCP lead creation and management
* CRM status tracking
* HCP interaction logging
* AI-generated interaction summaries
* Sentiment detection
* Suggested follow-up generation
* CRM insight tags
* AI Copilot for natural-language CRM actions
* Dashboard analytics for leads, interactions, and engagement health
* Backend health monitoring for AI tools and LangGraph status

---

## Core Features

### 1. Dashboard Workspace

The dashboard provides a real-time overview of CRM activity, including:

* Total leads
* Qualified leads
* Converted leads
* Total interactions
* Lead status distribution
* Interaction sentiment analysis
* Lead trend analytics
* Interaction trend analytics
* AI tools health status
* Empty-state handling when no data exists

The dashboard is optimized for clean visual reporting and demo-ready presentation.

---

### 2. HCP Lead Management

The Leads module allows users to manage healthcare professional records with a polished CRM interface.

Key capabilities:

* Add new HCP leads
* Edit existing leads
* Delete leads
* Search leads
* Track lead status
* View real-time status guide counts
* Manage doctor, nurse, pharmacist, admin, and other HCP categories
* Responsive table layout with internal scrolling
* Long names and phone numbers are fully visible

Lead statuses include:

* New
* Contacted
* Qualified
* Converted
* Lost

---

### 3. AI Copilot

The AI Copilot allows users to perform CRM actions using natural language.

Example actions:

* Create a lead using a natural-language prompt
* Log an interaction for an existing lead
* Ask for grounded follow-up suggestions
* Retrieve lead context
* Generate CRM-ready summaries

Example prompt:

```text
Create a lead for Dr. Divya Sharma email divya@gmail.com phone 9876543212
```

The Copilot validates important fields before saving data and prevents incomplete lead creation when required details are missing.

---

### 4. HCP Interaction Intelligence

The Interaction module is used to log field conversations against specific HCP leads.

For each logged interaction, the system can generate:

* AI summary
* Sentiment
* Suggested follow-up
* CRM insight tags
* Linked lead context
* Follow-up status tracking

Follow-up statuses:

* Pending
* Completed
* Dismissed

The interaction history includes search, sentiment filtering, master-detail view, and clear-history support.

---

### 5. LangGraph and Groq AI Integration

The AI workflow uses LangGraph for structured agent execution and Groq LLM for fast AI responses.

The backend health endpoint is used to power live AI tool status indicators in the UI.

```text
/health
```

The sidebar displays LangGraph version and backend status using a live health signal.

---

## Tech Stack

### Frontend

* React
* Vite
* Tailwind CSS
* Framer Motion
* Lucide React
* Recharts
* React Router DOM

### Backend

* FastAPI
* SQLAlchemy
* Pydantic
* PostgreSQL
* Uvicorn
* Python Dotenv

### AI Layer

* LangGraph 1.1.10
* LangChain
* LangChain Core
* LangChain Groq
* Groq LLM

### Database

* PostgreSQL
* SQLAlchemy ORM

### Version Control and Deployment

* Git
* GitHub
* Vercel for frontend deployment
* Render for backend deployment

---

## Project Structure

```text
AI_HCP_CRM_360/
│
├── backend/
│   ├── app/
│   │   ├── ai/
│   │   │   ├── agent.py
│   │   │   ├── nodes/
│   │   │   │   └── parser.py
│   │   │   └── tools/
│   │   │       ├── lead_tools.py
│   │   │       └── interaction_tools.py
│   │   ├── routes/
│   │   │   └── dashboard.py
│   │   ├── crud.py
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── models.py
│   │   └── schemas.py
│   │
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Sidebar.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Leads.jsx
│   │   │   ├── Chat.jsx
│   │   │   └── Interaction.jsx
│   │   ├── config.js
│   │   └── index.css
│   │
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/rajshekar0/AI_HCP_CRM_360.git
cd AI_HCP_CRM_360
```

---

## Backend Setup

### 1. Move to Backend Folder

```bash
cd backend
```

### 2. Create Virtual Environment

```bash
python -m venv venv
```

### 3. Activate Virtual Environment

For Windows:

```bash
venv\Scripts\activate
```

If the terminal does not pick the virtual environment correctly, run Python directly from the venv:

```bash
venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Configure Environment Variables

Create a `.env` file inside the `backend` folder.

```env
DATABASE_URL=postgresql://postgres:YOUR_LOCAL_PASSWORD@localhost:5432/ai_crm_hcp_local
GROQ_API_KEY=your_groq_api_key_here
```

Do not commit real API keys or database passwords.

### 6. Start Backend Server

```bash
venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Backend runs on:

```text
http://127.0.0.1:8000
```

Health check:

```text
http://127.0.0.1:8000/health
```

---

## Frontend Setup

### 1. Move to Frontend Folder

```bash
cd frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Frontend Environment

Create a `.env` file inside the `frontend` folder if needed.

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### 4. Start Frontend Server

```bash
npm run dev
```

Frontend usually runs on:

```text
http://localhost:5173
```

---

## Build Test

Run this before deployment or release:

```bash
cd frontend
npm run build
```

A successful build confirms the frontend is production-ready.

---

## Main API Endpoints

```text
GET     /health
GET     /leads
POST    /leads
PUT     /leads/{lead_id}
DELETE  /leads/{lead_id}
GET     /interactions
POST    /interactions
PUT     /interactions/{interaction_id}/follow-up-status
DELETE  /clear-interactions
POST    /chat
GET     /dashboard/summary
```

Endpoint names may vary slightly depending on backend route organization.

---

## AI Capabilities

AI HCP-CRM 360 uses LangGraph-powered workflow logic to support CRM actions such as:

* Lead creation from natural-language prompts
* Lead validation
* Duplicate lead handling
* Interaction logging
* Lead-to-interaction linking
* AI summaries
* Sentiment classification
* Follow-up recommendations
* CRM insight tagging

---

## Database Notes

The project uses PostgreSQL as the primary database.

For a clean local reset during testing, the following SQL can be used carefully:

```sql
TRUNCATE TABLE interactions, leads RESTART IDENTITY CASCADE;
```

Use this only in local development or test environments.

---

## Release History

### stable-v1

Initial stable version of the CRM application.

### stable-v2

AI HCP-CRM 360 rebranded stable release with:

* Complete sidebar rebranding
* Dashboard polish
* Chat/Copilot improvements
* Interaction intelligence refinements
* Lead page UI fixes
* Backend validation improvements
* Parser improvements for doctor/HCP lead creation
* AI result formatting improvements
* Empty-state dashboard handling
* Local PostgreSQL testing support
* Stable frontend production build

---

## Git Tags

```bash
git tag
```

Current stable tags:

```text
stable-v1
stable-v2
```

---

## Deployment Plan

The project is prepared for deployment using:

* Vercel for frontend
* Render for backend
* PostgreSQL cloud database such as Neon, Supabase, or Render PostgreSQL

Recommended deployment environment values:

### Frontend

```env
VITE_API_BASE_URL=https://your-backend-service-url
```

### Backend

```env
DATABASE_URL=your_cloud_postgresql_connection_string
GROQ_API_KEY=your_groq_api_key
```

---

## Security Notes

* Keep `.env` files out of GitHub.
* Never commit API keys.
* Never commit database passwords.
* Use environment variables in deployment platforms.
* Use separate local and production database URLs.

---

## Future Enhancements

Possible future improvements:

* Role-based authentication
* Admin dashboard
* HCP profile enrichment
* Advanced follow-up reminders
* Email integration
* Calendar integration
* Export reports as PDF/Excel
* Advanced analytics filters
* Production cloud database migration
* CI/CD workflow

---

## Author

**Raj Shekar**

GitHub: [rajshekar0](https://github.com/rajshekar0)

---

## Project Name

```text
AI HCP-CRM 360
```

Meaning:

* **AI**: Copilot, summaries, sentiment, follow-ups, and intelligent CRM automation
* **HCP**: Healthcare Professional domain
* **CRM**: Lead, interaction, and relationship management
* **360**: Complete view of HCP engagement lifecycle
