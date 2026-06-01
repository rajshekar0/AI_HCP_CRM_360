from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
import os

from .database import engine, get_db
from . import models, schemas, crud
from app.ai.agent import app as graph_app
from app.routes.dashboard import router as dashboard_router
from app.ai.tools.interaction_tools import log_interaction_tool


app = FastAPI(title="AI HCP-CRM 360 Backend", version="2.0.0")


DEFAULT_FRONTEND_URLS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://ai-hcp-crm-360.vercel.app",
    "https://ai-first-crm-frontend.vercel.app",
]

frontend_urls_from_env = [
    url.strip()
    for url in os.getenv("FRONTEND_URLS", "").split(",")
    if url.strip()
]

allowed_frontend_urls = list(
    dict.fromkeys(DEFAULT_FRONTEND_URLS + frontend_urls_from_env)
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_frontend_urls,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


models.Base.metadata.create_all(bind=engine)


def ensure_lead_columns():
    required_columns = {
        "first_name": "VARCHAR",
        "last_name": "VARCHAR",
        "initials": "VARCHAR",
        "designation": "VARCHAR DEFAULT 'other'",
    }

    try:
        with engine.connect() as connection:
            db_type = engine.url.get_backend_name()

            if db_type == "postgresql":
                existing_columns = connection.execute(
                    text(
                        """
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_name = 'leads'
                        """
                    )
                ).fetchall()

                existing_column_names = {row[0] for row in existing_columns}

                for column_name, column_type in required_columns.items():
                    if column_name not in existing_column_names:
                        connection.execute(
                            text(
                                f"ALTER TABLE leads "
                                f"ADD COLUMN {column_name} {column_type};"
                            )
                        )

                connection.execute(
                    text(
                        """
                        UPDATE leads
                        SET designation = 'other'
                        WHERE designation IS NULL OR designation = '';
                        """
                    )
                )

                connection.execute(
                    text(
                        """
                        ALTER TABLE leads
                        ALTER COLUMN designation SET DEFAULT 'other';
                        """
                    )
                )

                connection.commit()

            elif db_type == "sqlite":
                existing_columns = connection.execute(
                    text("PRAGMA table_info(leads);")
                ).fetchall()

                existing_column_names = {row[1] for row in existing_columns}

                for column_name, column_type in required_columns.items():
                    if column_name not in existing_column_names:
                        connection.execute(
                            text(
                                f"ALTER TABLE leads "
                                f"ADD COLUMN {column_name} {column_type};"
                            )
                        )

                connection.execute(
                    text(
                        """
                        UPDATE leads
                        SET designation = 'other'
                        WHERE designation IS NULL OR designation = '';
                        """
                    )
                )

                connection.commit()

    except Exception as error:
        print(f"Lead column migration skipped/failed: {error}")


def ensure_interaction_columns():
    required_columns = {
        "follow_up": "TEXT",
        "tags": "TEXT",
        "follow_up_status": "VARCHAR DEFAULT 'pending'",
    }

    try:
        with engine.connect() as connection:
            db_type = engine.url.get_backend_name()

            if db_type == "postgresql":
                existing_columns = connection.execute(
                    text(
                        """
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_name = 'interactions'
                        """
                    )
                ).fetchall()

                existing_column_names = {row[0] for row in existing_columns}

                for column_name, column_type in required_columns.items():
                    if column_name not in existing_column_names:
                        connection.execute(
                            text(
                                f"ALTER TABLE interactions "
                                f"ADD COLUMN {column_name} {column_type};"
                            )
                        )

                connection.commit()

            elif db_type == "sqlite":
                existing_columns = connection.execute(
                    text("PRAGMA table_info(interactions);")
                ).fetchall()

                existing_column_names = {row[1] for row in existing_columns}

                for column_name, column_type in required_columns.items():
                    if column_name not in existing_column_names:
                        connection.execute(
                            text(
                                f"ALTER TABLE interactions "
                                f"ADD COLUMN {column_name} {column_type};"
                            )
                        )

                connection.commit()

    except Exception as error:
        print(f"Interaction column migration skipped/failed: {error}")


ensure_lead_columns()
ensure_interaction_columns()
app.include_router(dashboard_router)


def serialize_interaction(interaction, lead=None):
    return {
        "id": interaction.id,
        "lead_id": interaction.lead_id,
        "lead_name": lead.name if lead else None,
        "lead_email": lead.email if lead else None,
        "lead_phone": lead.phone if lead else None,
        "lead_designation": lead.designation if lead else None,
        "notes": interaction.notes,
        "summary": interaction.summary,
        "sentiment": interaction.sentiment,
        "follow_up": interaction.follow_up,
        "tags": interaction.tags,
        "follow_up_status": interaction.follow_up_status,
        "created_at": interaction.created_at.isoformat()
        if getattr(interaction, "created_at", None)
        else None,
    }


def get_system_status():
    database_status = {
        "status": "unknown",
        "message": "",
        "database_url_type": "",
        "leads_count": None,
        "interactions_count": None,
    }

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

            leads_count = connection.execute(
                text("SELECT COUNT(*) FROM leads")
            ).scalar_one()

            interactions_count = connection.execute(
                text("SELECT COUNT(*) FROM interactions")
            ).scalar_one()

            database_status = {
                "status": "connected",
                "message": "Database connection successful",
                "database_url_type": engine.url.get_backend_name(),
                "leads_count": leads_count,
                "interactions_count": interactions_count,
            }

    except Exception as error:
        database_status = {
            "status": "error",
            "message": str(error),
            "database_url_type": engine.url.get_backend_name(),
            "leads_count": None,
            "interactions_count": None,
        }

    return {
        "status": "healthy"
        if database_status["status"] == "connected"
        else "degraded",
        "service": "AI HCP-CRM 360 Backend",
        "message": "AI HCP-CRM 360 Backend is running",
        "version": "2.0.0",
        "database": database_status,
        "cors": {
            "allowed_frontend_urls": allowed_frontend_urls,
            "vercel_preview_allowed": True,
        },
        "available_routes": {
            "root": "/",
            "status": "/status",
            "health": "/health",
            "ai_status": "/ai/status",
            "chat": "/chat",
            "leads_create": "POST /leads",
            "leads_list": "GET /leads",
            "leads_update": "PUT /leads/{lead_id}",
            "leads_delete": "DELETE /leads/{lead_id}",
            "interactions_create": "POST /interactions",
            "interactions_list": "GET /interactions",
            "interaction_follow_up_status": "/interactions/{interaction_id}/follow-up-status",
            "dashboard_stats": "/dashboard/stats",
            "clear_interactions": "/clear-interactions",
            "reset_all": "/reset-all",
        },
    }


@app.get("/")
def root():
    return get_system_status()


@app.get("/status")
def status():
    return get_system_status()


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AI HCP-CRM 360 Backend",
        "version": "2.0.0",
    }


@app.get("/ai/status")
def ai_status():
    groq_key_configured = bool(os.getenv("GROQ_API_KEY"))

    return {
        "status": "active" if groq_key_configured else "degraded",
        "service": "AI Engine",
        "langgraph": "active",
        "llm_provider": "groq",
        "api_key_configured": groq_key_configured,
        "message": (
            "AI engine is configured"
            if groq_key_configured
            else "AI engine route is available, but Groq API key is not configured"
        ),
    }


class ChatRequest(BaseModel):
    input: str
    session_id: str = "default"


class FollowUpStatusUpdate(BaseModel):
    status: str


class InteractionCreate(BaseModel):
    lead_id: int
    notes: str


@app.post("/chat")
def chat(req: ChatRequest):
    result = graph_app.invoke({
        "input": req.input,
        "session_id": req.session_id,
    })
    return result


@app.post("/leads")
def create_lead(
    lead: schemas.LeadCreate,
    db: Session = Depends(get_db),
):
    return crud.create_lead(db, lead)


@app.get("/leads")
def get_leads(db: Session = Depends(get_db)):
    return crud.get_leads(db)


@app.put("/leads/{lead_id}")
def update_lead(
    lead_id: int,
    lead_update: schemas.LeadUpdate,
    db: Session = Depends(get_db),
):
    lead = crud.update_lead(db, lead_id, lead_update)

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    return lead


@app.delete("/leads/{lead_id}")
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
):
    lead = crud.delete_lead(db, lead_id)

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    return {
        "message": "Lead deleted successfully",
    }


@app.post("/interactions")
def create_interaction(
    payload: InteractionCreate,
    db: Session = Depends(get_db),
):
    notes = (payload.notes or "").strip()

    if not notes:
        raise HTTPException(
            status_code=400,
            detail="Interaction notes are required",
        )

    lead = (
        db.query(models.Lead)
        .filter(models.Lead.id == payload.lead_id)
        .first()
    )

    if not lead:
        raise HTTPException(
            status_code=404,
            detail=f"Lead ID {payload.lead_id} not found",
        )

    result = log_interaction_tool({
        "lead_id": payload.lead_id,
        "notes": notes,
    })

    return {
        **result,
        "lead_id": lead.id,
        "lead_name": lead.name,
        "lead_email": lead.email,
        "lead_phone": lead.phone,
        "lead_designation": lead.designation,
    }


@app.get("/interactions")
def get_interactions(db: Session = Depends(get_db)):
    interactions = (
        db.query(models.Interaction)
        .order_by(models.Interaction.created_at.desc())
        .all()
    )

    lead_ids = {
        interaction.lead_id
        for interaction in interactions
        if interaction.lead_id is not None
    }

    leads = (
        db.query(models.Lead)
        .filter(models.Lead.id.in_(lead_ids))
        .all()
        if lead_ids
        else []
    )

    leads_by_id = {lead.id: lead for lead in leads}

    return [
        serialize_interaction(
            interaction,
            leads_by_id.get(interaction.lead_id),
        )
        for interaction in interactions
    ]


@app.put("/interactions/{interaction_id}/follow-up-status")
def update_interaction_follow_up_status(
    interaction_id: int,
    payload: FollowUpStatusUpdate,
    db: Session = Depends(get_db),
):
    allowed_statuses = {"pending", "completed", "ignored"}
    status = (payload.status or "").strip().lower()

    if status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid follow-up status. Use pending, completed, or ignored.",
        )

    interaction = (
        db.query(models.Interaction)
        .filter(models.Interaction.id == interaction_id)
        .first()
    )

    if not interaction:
        raise HTTPException(
            status_code=404,
            detail="Interaction not found",
        )

    interaction.follow_up_status = status
    db.commit()
    db.refresh(interaction)

    return {
        "message": "Follow-up status updated successfully",
        "interaction_id": interaction.id,
        "follow_up_status": interaction.follow_up_status,
    }


@app.delete("/clear-interactions")
def clear_interactions(db: Session = Depends(get_db)):
    db.query(models.Interaction).delete()
    db.commit()

    return {
        "message": "Interactions cleared successfully",
    }


@app.delete("/reset-all")
def reset_all_data(db: Session = Depends(get_db)):
    try:
        if str(engine.url).startswith("sqlite"):
            db.query(models.Interaction).delete()
            db.query(models.Lead).delete()
            db.commit()

            sequence_exists = db.execute(
                text(
                    "SELECT name FROM sqlite_master "
                    "WHERE type='table' AND name='sqlite_sequence';"
                )
            ).first()

            if sequence_exists:
                db.execute(
                    text(
                        "DELETE FROM sqlite_sequence "
                        "WHERE name IN ('leads', 'interactions');"
                    )
                )
                db.commit()

        else:
            db.execute(
                text(
                    "TRUNCATE TABLE interactions, leads "
                    "RESTART IDENTITY CASCADE;"
                )
            )
            db.commit()

        return {
            "message": "All database records cleared and IDs reset to 1",
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Reset failed: {str(e)}",
        )
