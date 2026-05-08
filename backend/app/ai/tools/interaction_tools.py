from app.database import SessionLocal
from app import models
from app.ai.core.llm import invoke_llm


def detect_sentiment(notes: str) -> str:
    lower = (notes or "").lower()
    if any(word in lower for word in ["not interested", "negative", "rejected", "declined", "not satisfied"]):
        return "negative"
    if any(word in lower for word in ["interested", "positive", "liked", "requested", "asked for samples", "follow-up", "follow up"]):
        return "positive"
    return "neutral"


def log_interaction_tool(data: dict):
    db = SessionLocal()
    try:
        notes = data.get("notes")
        if not notes:
            return {"message": "Interaction logging failed", "error": "Notes are required"}

        prompt = f"Summarize this HCP/doctor interaction in one short CRM-friendly sentence:\n\n{notes}"
        summary = invoke_llm(prompt, fallback=f"Interaction note: {notes[:120]}")
        sentiment = detect_sentiment(notes)

        interaction = models.Interaction(lead_id=data.get("lead_id"), notes=notes, summary=summary, sentiment=sentiment)
        db.add(interaction)
        db.commit()
        db.refresh(interaction)

        return {"message": "Interaction logged successfully", "interaction_id": interaction.id, "notes": interaction.notes, "summary": interaction.summary, "sentiment": interaction.sentiment}
    except Exception as e:
        db.rollback()
        return {"message": "Interaction logging failed", "error": str(e)}
    finally:
        db.close()


def edit_interaction_tool(interaction_id: int, updates: dict):
    db = SessionLocal()
    try:
        interaction = db.query(models.Interaction).filter(models.Interaction.id == interaction_id).first()
        if not interaction:
            return {"message": "Interaction update failed", "error": "Interaction not found"}
        if "notes" in updates:
            interaction.notes = updates["notes"]
        if "summary" in updates:
            interaction.summary = updates["summary"]
        if "sentiment" in updates:
            interaction.sentiment = updates["sentiment"]
        db.commit()
        db.refresh(interaction)
        return {"message": "Interaction updated successfully", "interaction_id": interaction.id, "notes": interaction.notes, "summary": interaction.summary, "sentiment": interaction.sentiment}
    except Exception as e:
        db.rollback()
        return {"message": "Interaction update failed", "error": str(e)}
    finally:
        db.close()


def suggest_followups_tool(data: dict):
    notes = data.get("notes") or ""
    if not notes:
        return {"message": "Follow-up generation failed", "error": "No interaction notes provided"}
    prompt = f"Based on this HCP/doctor interaction, suggest 3 practical follow-up actions for a pharma field representative:\n\n{notes}"
    suggestions = invoke_llm(prompt, fallback="1. Schedule a follow-up meeting.\n2. Share relevant product information.\n3. Add this HCP to follow-up tracking.")
    return {"message": "Follow-up suggestions generated", "suggestions": suggestions}
