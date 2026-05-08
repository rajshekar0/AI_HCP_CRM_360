from app.database import SessionLocal
from app import models


def get_recent_leads(limit: int = 5):
    db = SessionLocal()
    try:
        leads = db.query(models.Lead).order_by(models.Lead.id.desc()).limit(limit).all()
        return [{"id": l.id, "name": l.name, "email": l.email, "phone": l.phone, "status": l.status} for l in leads]
    finally:
        db.close()


def get_recent_interactions(limit: int = 5):
    db = SessionLocal()
    try:
        items = db.query(models.Interaction).order_by(models.Interaction.id.desc()).limit(limit).all()
        return [{"id": i.id, "notes": i.notes, "summary": i.summary, "sentiment": i.sentiment} for i in items]
    finally:
        db.close()
