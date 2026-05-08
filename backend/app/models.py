from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from .database import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, nullable=True)
    status = Column(String, default="new")
    created_at = Column(DateTime, default=datetime.utcnow)


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    notes = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    sentiment = Column(String, default="neutral")
    created_at = Column(DateTime, default=datetime.utcnow)
