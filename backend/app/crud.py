from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from . import models, schemas


def create_lead(db: Session, lead: schemas.LeadCreate):
    db_lead = models.Lead(
        name=lead.name,
        email=lead.email,
        phone=lead.phone,
        status=lead.status or "new",
    )
    try:
        db.add(db_lead)
        db.commit()
        db.refresh(db_lead)
        return db_lead
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already exists. Please use a different email.")


def get_leads(db: Session):
    return db.query(models.Lead).order_by(models.Lead.created_at.desc()).all()


def update_lead(db: Session, lead_id: int, lead_update: schemas.LeadUpdate):
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        return None

    if lead_update.name is not None:
        lead.name = lead_update.name
    if lead_update.email is not None:
        lead.email = lead_update.email
    if lead_update.phone is not None:
        lead.phone = lead_update.phone
    if lead_update.status is not None:
        lead.status = lead_update.status

    try:
        db.commit()
        db.refresh(lead)
        return lead
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already exists. Please use a different email.")


def delete_lead(db: Session, lead_id: int):
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        return None
    db.delete(lead)
    db.commit()
    return lead
