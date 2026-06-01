from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from . import models, schemas


def check_duplicate_email(
    db: Session,
    email: str | None,
    exclude_lead_id: int | None = None
):
    if not email:
        return

    email = str(email).strip().lower()

    query = db.query(models.Lead).filter(models.Lead.email == email)

    if exclude_lead_id is not None:
        query = query.filter(models.Lead.id != exclude_lead_id)

    existing = query.first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already exists. Please use a different email."
        )


def check_duplicate_phone(
    db: Session,
    phone: str | None,
    exclude_lead_id: int | None = None
):
    if not phone:
        return

    phone = str(phone).strip()

    query = db.query(models.Lead).filter(models.Lead.phone == phone)

    if exclude_lead_id is not None:
        query = query.filter(models.Lead.id != exclude_lead_id)

    existing = query.first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Phone number already exists. Please use a different phone number."
        )


def create_lead(db: Session, lead: schemas.LeadCreate):
    """
    Create a lead with SaaS-level rules:
    - first name required
    - email required
    - phone required
    - email unique
    - phone unique
    - Dr./Doctor prefix is stripped by schema
    - designation is doctor only when detected/provided, otherwise other
    - status starts as new
    """

    check_duplicate_email(db, lead.email)
    check_duplicate_phone(db, lead.phone)

    db_lead = models.Lead(
        name=lead.name,
        first_name=lead.first_name,
        last_name=lead.last_name,
        initials=lead.initials,
        email=str(lead.email).lower() if lead.email else None,
        phone=lead.phone,
        designation=lead.designation or "other",
        status="new",
    )

    try:
        db.add(db_lead)
        db.commit()
        db.refresh(db_lead)
        return db_lead

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Lead already exists. Please use a different email or phone number."
        )


def get_leads(db: Session):
    return (
        db.query(models.Lead)
        .order_by(models.Lead.created_at.desc())
        .all()
    )


def update_lead(db: Session, lead_id: int, lead_update: schemas.LeadUpdate):
    """
    Product-safe lead update:
    - name fields are locked after creation
    - designation is locked after creation
    - email can be updated if unique
    - phone can be updated if unique
    - status can be updated from table dropdown
    """

    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()

    if not lead:
        return None

    if lead_update.email is not None:
        check_duplicate_email(db, lead_update.email, exclude_lead_id=lead_id)

    if lead_update.phone is not None:
        check_duplicate_phone(db, lead_update.phone, exclude_lead_id=lead_id)

    # Identity fields intentionally ignored after creation.
    # lead.name is not updated here.
    # lead.first_name is not updated here.
    # lead.last_name is not updated here.
    # lead.initials is not updated here.
    # lead.designation is not updated here.

    if lead_update.email is not None:
        lead.email = str(lead_update.email).lower() if lead_update.email else None

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
        raise HTTPException(
            status_code=400,
            detail="Lead already exists. Please use a different email or phone number."
        )


def delete_lead(db: Session, lead_id: int):
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()

    if not lead:
        return None

    db.delete(lead)
    db.commit()

    return lead