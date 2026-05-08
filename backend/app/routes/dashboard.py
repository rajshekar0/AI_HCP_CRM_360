from fastapi import APIRouter
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_dashboard_stats():
    db: Session = SessionLocal()
    try:
        total_leads = db.query(models.Lead).count()
        interactions = db.query(models.Interaction).all()
        total_interactions = len(interactions)

        positive_count = neutral_count = negative_count = 0
        for interaction in interactions:
            sentiment = (interaction.sentiment or "neutral").lower()
            if sentiment == "positive":
                positive_count += 1
            elif sentiment == "negative":
                negative_count += 1
            else:
                neutral_count += 1

        positive_sentiment = int((positive_count / total_interactions) * 100) if total_interactions else 0

        pending_followups = 0
        for interaction in interactions:
            notes = (interaction.notes or "").lower()
            summary = (interaction.summary or "").lower()
            if any(x in notes or x in summary for x in ["follow-up", "follow up", "next step", "requested", "samples"]):
                pending_followups += 1

        weekly_counts = {"Mon": 0, "Tue": 0, "Wed": 0, "Thu": 0, "Fri": 0, "Sat": 0, "Sun": 0}
        for interaction in interactions:
            if interaction.created_at:
                day = interaction.created_at.strftime("%a")
                if day in weekly_counts:
                    weekly_counts[day] += 1

        weekly_data = [{"day": day, "interactions": weekly_counts[day]} for day in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]]
        sentiment_data = [
            {"name": "Positive", "value": positive_count},
            {"name": "Neutral", "value": neutral_count},
            {"name": "Negative", "value": negative_count},
        ]

        recent_interactions = db.query(models.Interaction).order_by(models.Interaction.id.desc()).limit(6).all()
        feed = [{"notes": i.notes, "summary": i.summary, "sentiment": i.sentiment} for i in recent_interactions]
        if not feed:
            feed = [{"notes": "No CRM activity yet. Start by creating a lead or logging an interaction.", "summary": "Waiting for first CRM activity.", "sentiment": "neutral"}]

        if total_leads == 0 and total_interactions == 0:
            news = [
                "Workspace is clean and ready for a fresh CRM walkthrough.",
                "Create your first HCP lead to begin tracking engagement.",
                "Log your first HCP interaction to activate AI summaries and sentiment insights.",
                "LangGraph agent is ready to process CRM actions.",
            ]
        else:
            news = [
                f"{total_leads} leads currently available in CRM.",
                f"{total_interactions} interactions logged so far.",
                f"Positive sentiment currently at {positive_sentiment}%.",
                f"{pending_followups} follow-up opportunities detected from interaction history.",
            ]

        return {
            "total_leads": total_leads,
            "total_interactions": total_interactions,
            "positive_sentiment": positive_sentiment,
            "pending_followups": pending_followups,
            "weekly_data": weekly_data,
            "sentiment_data": sentiment_data,
            "feed": feed,
            "news": news,
        }
    finally:
        db.close()
