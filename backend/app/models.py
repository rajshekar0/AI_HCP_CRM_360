from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from .database import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)

    # Display name used across UI/search/chat.
    # Example: "Shreshta Gowda H J"
    name = Column(String, nullable=False)

    # Structured name fields.
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    initials = Column(String, nullable=True)

    # Contact fields.
    # New lead creation requires email and phone through schemas.py.
    # Kept nullable here so old records do not break migrations.
    email = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, unique=True, index=True, nullable=True)

    # HCP role.
    # Default is "other", not "doctor".
    # If user enters Dr./Doctor, schemas.py auto-assigns doctor.
    designation = Column(String, default="other", nullable=False)

    # Lifecycle status is controlled from the Leads table dropdown.
    status = Column(String, default="new")

    created_at = Column(DateTime, default=datetime.utcnow)


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)

    # Raw interaction note entered by user / rep.
    notes = Column(Text, nullable=False)

    # AI-enriched fields.
    summary = Column(Text, nullable=True)
    sentiment = Column(String, default="neutral")
    follow_up = Column(Text, nullable=True)
    tags = Column(Text, nullable=True)

    # Follow-up lifecycle.
    follow_up_status = Column(String, default="pending")

    created_at = Column(DateTime, default=datetime.utcnow)