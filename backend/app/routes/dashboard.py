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

        interactions = (
            db.query(models.Interaction)
            .order_by(models.Interaction.created_at.desc())
            .all()
        )

        total_interactions = len(interactions)

        positive_count = 0
        neutral_count = 0
        negative_count = 0

        pending_followups = 0
        completed_followups = 0
        ignored_followups = 0

        tag_counter = {}

        for interaction in interactions:
            sentiment = (interaction.sentiment or "neutral").lower()

            if sentiment == "positive":
                positive_count += 1
            elif sentiment == "negative":
                negative_count += 1
            else:
                neutral_count += 1

            follow_up_status = (
                getattr(interaction, "follow_up_status", None) or "pending"
            ).lower()

            if follow_up_status == "completed":
                completed_followups += 1
            elif follow_up_status == "ignored":
                ignored_followups += 1
            else:
                if getattr(interaction, "follow_up", None):
                    pending_followups += 1

            raw_tags = getattr(interaction, "tags", None) or ""

            for tag in raw_tags.split(","):
                clean_tag = tag.strip().lower()

                if not clean_tag:
                    continue

                tag_counter[clean_tag] = tag_counter.get(clean_tag, 0) + 1

        positive_sentiment = (
            int((positive_count / total_interactions) * 100)
            if total_interactions
            else 0
        )

        weekly_counts = {
            "Mon": 0,
            "Tue": 0,
            "Wed": 0,
            "Thu": 0,
            "Fri": 0,
            "Sat": 0,
            "Sun": 0,
        }

        for interaction in interactions:
            if interaction.created_at:
                day = interaction.created_at.strftime("%a")

                if day in weekly_counts:
                    weekly_counts[day] += 1

        weekly_data = [
            {
                "day": day,
                "interactions": weekly_counts[day],
            }
            for day in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        ]

        sentiment_data = [
            {
                "name": "Positive",
                "value": positive_count,
            },
            {
                "name": "Neutral",
                "value": neutral_count,
            },
            {
                "name": "Negative",
                "value": negative_count,
            },
        ]

        top_tags = [
            {
                "tag": tag,
                "count": count,
            }
            for tag, count in sorted(
                tag_counter.items(),
                key=lambda item: item[1],
                reverse=True,
            )[:8]
        ]

        recent_interactions = interactions[:6]

        feed = [
            {
                "id": interaction.id,
                "notes": interaction.notes,
                "summary": interaction.summary,
                "sentiment": interaction.sentiment,
                "follow_up": getattr(interaction, "follow_up", None),
                "tags": getattr(interaction, "tags", None),
                "follow_up_status": getattr(
                    interaction,
                    "follow_up_status",
                    "pending",
                ),
            }
            for interaction in recent_interactions
        ]

        if not feed:
            feed = [
                {
                    "id": None,
                    "notes": (
                        "No CRM activity yet. Start by creating a lead or "
                        "logging an interaction."
                    ),
                    "summary": "Waiting for first CRM activity.",
                    "sentiment": "neutral",
                    "follow_up": (
                        "Create your first lead and log an HCP interaction "
                        "to activate AI follow-up intelligence."
                    ),
                    "tags": "getting-started, clean-workspace",
                    "follow_up_status": "pending",
                }
            ]

        if total_leads == 0 and total_interactions == 0:
            news = [
                "Workspace is clean and ready for a fresh CRM walkthrough.",
                "Create your first HCP lead to begin tracking engagement.",
                "Log your first HCP interaction to activate AI summaries, sentiment, follow-ups, and tags.",
                "LangGraph agent is ready to process CRM actions.",
            ]
        else:
            news = [
                f"{total_leads} leads currently available in CRM.",
                f"{total_interactions} AI-enriched interactions logged so far.",
                f"Positive sentiment currently at {positive_sentiment}%.",
                f"{pending_followups} pending follow-up recommendations available.",
                f"{completed_followups} follow-ups marked completed.",
                f"{len(top_tags)} active CRM tags detected from interaction history.",
            ]

        return {
            "total_leads": total_leads,
            "total_interactions": total_interactions,
            "positive_sentiment": positive_sentiment,
            "pending_followups": pending_followups,
            "completed_followups": completed_followups,
            "ignored_followups": ignored_followups,
            "weekly_data": weekly_data,
            "sentiment_data": sentiment_data,
            "top_tags": top_tags,
            "feed": feed,
            "news": news,
        }

    finally:
        db.close()