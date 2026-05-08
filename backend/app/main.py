
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

app = FastAPI(title="AI First CRM", version="1.0.0")

frontend_urls = os.getenv("FRONTEND_URLS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[url.strip() for url in frontend_urls],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)
app.include_router(dashboard_router)


@app.get("/")
def root():
    return {"message": "AI First CRM Running"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "AI First CRM Backend"}


class ChatRequest(BaseModel):
    input: str
    session_id: str = "default"


@app.post("/chat")
def chat(req: ChatRequest):
    result = graph_app.invoke({"input": req.input, "session_id": req.session_id})
    return result


@app.post("/leads")
def create_lead(lead: schemas.LeadCreate, db: Session = Depends(get_db)):
    return crud.create_lead(db, lead)


@app.get("/leads")
def get_leads(db: Session = Depends(get_db)):
    return crud.get_leads(db)


@app.put("/leads/{lead_id}")
def update_lead(lead_id: int, lead_update: schemas.LeadUpdate, db: Session = Depends(get_db)):
    lead = crud.update_lead(db, lead_id, lead_update)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@app.delete("/leads/{lead_id}")
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = crud.delete_lead(db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead deleted successfully"}


@app.get("/interactions")
def get_interactions(db: Session = Depends(get_db)):
    return db.query(models.Interaction).order_by(models.Interaction.created_at.desc()).all()


@app.delete("/clear-interactions")
def clear_interactions(db: Session = Depends(get_db)):
    db.query(models.Interaction).delete()
    db.commit()
    return {"message": "Interactions cleared successfully"}


@app.delete("/reset-all")
def reset_all_data(db: Session = Depends(get_db)):
    try:
        if str(engine.url).startswith("sqlite"):
            db.query(models.Interaction).delete()
            db.query(models.Lead).delete()
            db.commit()

            # sqlite_sequence exists only when tables use AUTOINCREMENT.
            # The app works without it, so reset IDs only when the table exists.
            sequence_exists = db.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_sequence';")
            ).first()
            if sequence_exists:
                db.execute(text("DELETE FROM sqlite_sequence WHERE name IN ('leads', 'interactions');"))
                db.commit()
        else:
            db.execute(text("TRUNCATE TABLE interactions, leads RESTART IDENTITY CASCADE;"))
            db.commit()
        return {"message": "All database records cleared and IDs reset to 1"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")
