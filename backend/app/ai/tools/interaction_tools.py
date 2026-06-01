import re
from sqlalchemy import func
from app.database import SessionLocal
from app import models
from app.ai.core.llm import invoke_llm


NEGATIVE_KEYWORDS = [
    "not interested",
    "negative",
    "rejected",
    "declined",
    "not satisfied",
    "unhappy",
    "poor",
    "complained",
    "complaint",
    "delay",
    "delayed",
    "side effect",
    "side effects",
    "safety concern",
    "concerns",
    "too expensive",
    "high price",
    "competitor",
    "not convinced",
    "refused",
    "do not visit",
    "don't visit",
]

POSITIVE_KEYWORDS = [
    "interested",
    "positive",
    "liked",
    "requested",
    "asked for samples",
    "sample",
    "follow-up",
    "follow up",
    "wants more information",
    "asked for data",
    "clinical trial",
    "pricing details",
    "ready",
    "considering",
]


def normalize_notes(notes: str) -> str:
    return " ".join((notes or "").strip().split())


def detect_sentiment(notes: str) -> str:
    lower = (notes or "").lower()

    if any(keyword in lower for keyword in NEGATIVE_KEYWORDS):
        return "negative"

    if any(keyword in lower for keyword in POSITIVE_KEYWORDS):
        return "positive"

    return "neutral"


def generate_summary(notes: str) -> str:
    prompt = f"""
Summarize this HCP/doctor interaction in one short CRM-friendly sentence.

Rules:
- Keep it concise.
- Mention the key HCP concern, interest, or request.
- Do not invent details.

Interaction:
{notes}
"""

    return invoke_llm(
        prompt,
        fallback=f"Interaction note: {notes[:120]}"
    )


def generate_follow_up(notes: str, sentiment: str) -> str:
    prompt = f"""
Based on this HCP/doctor interaction, generate one practical follow-up recommendation for a pharma field representative.

Rules:
- Be specific and actionable.
- If sentiment is negative, focus on resolving concerns and rebuilding trust.
- If sentiment is positive, focus on next conversion action.
- If sentiment is neutral, focus on information sharing or clarification.
- Keep it to 1-2 sentences.
- Do not invent CRM facts, dates, prescriptions, sales status, or HCP preferences.

Sentiment: {sentiment}

Interaction:
{notes}
"""

    fallback_map = {
        "negative": "Address the HCP's concern, share supporting evidence, and schedule a later follow-up only after resolving the issue.",
        "positive": "Share the requested product information or samples and schedule a follow-up discussion.",
        "neutral": "Share relevant product information and clarify the HCP's interest in a follow-up conversation.",
    }

    return invoke_llm(
        prompt,
        fallback=fallback_map.get(sentiment, fallback_map["neutral"])
    )


def generate_tags(notes: str, sentiment: str) -> str:
    prompt = f"""
Generate 3 to 5 short CRM insight tags for this HCP/doctor interaction.

Rules:
- Return only comma-separated tags.
- Use lowercase tags.
- Keep each tag short.
- Include sentiment-related tag if useful.
- Do not use hashtags.
- Do not invent details.

Sentiment: {sentiment}

Interaction:
{notes}

Examples:
positive, sample-request, clinical-data, follow-up-required
negative, complaint, sample-delay, trust-risk
neutral, information-request, pricing-discussion
"""

    fallback_tags = {
        "negative": "negative, complaint, follow-up-required",
        "positive": "positive, interested, follow-up-required",
        "neutral": "neutral, information-request",
    }

    tags = invoke_llm(
        prompt,
        fallback=fallback_tags.get(sentiment, fallback_tags["neutral"])
    )

    return tags.strip().lower()


def serialize_lead_for_choice(lead):
    return {
        "id": lead.id,
        "name": lead.name,
        "email": lead.email,
        "phone": lead.phone,
        "status": lead.status,
    }


def extract_lead_id_from_text(text: str):
    match = re.search(
        r"\b(?:lead\s*)?id\s*[:#-]?\s*(\d+)\b",
        text or "",
        re.IGNORECASE,
    )
    if match:
        return int(match.group(1))
    return None


def extract_name_after_for(text: str):
    raw_text = normalize_notes(text or "")

    if " for " not in f" {raw_text.lower()} ":
        return ""

    possible_name = raw_text.split(" for ", 1)[-1].strip()
    possible_name = possible_name.replace(".", "").replace("?", "").replace("!", "").strip()

    stop_words = [
        "please",
        "today",
        "tomorrow",
        "next week",
        "this week",
        "follow up",
        "follow-up",
        "followup",
        "lead id",
        "id",
    ]

    for stop_word in stop_words:
        if stop_word in possible_name.lower():
            possible_name = possible_name.lower().split(stop_word, 1)[0].strip()

    return normalize_notes(possible_name)


def find_duplicate_interaction(db, notes: str):
    normalized = normalize_notes(notes)

    if not normalized:
        return None

    return (
        db.query(models.Interaction)
        .filter(func.lower(models.Interaction.notes) == normalized.lower())
        .first()
    )


def log_interaction_tool(data: dict):
    db = SessionLocal()

    try:
        notes = normalize_notes(data.get("notes") or "")

        if not notes:
            return {
                "message": "Interaction logging failed",
                "error": "Notes are required",
                "saved": False,
            }

        duplicate = find_duplicate_interaction(db, notes)

        if duplicate:
            return {
                "message": "Duplicate interaction not saved",
                "error": "The same interaction note already exists in history.",
                "saved": False,
                "existing_interaction": {
                    "id": duplicate.id,
                    "lead_id": duplicate.lead_id,
                    "notes": duplicate.notes,
                    "summary": duplicate.summary,
                    "sentiment": duplicate.sentiment,
                    "follow_up": duplicate.follow_up,
                    "tags": duplicate.tags,
                    "follow_up_status": duplicate.follow_up_status,
                },
            }

        sentiment = detect_sentiment(notes)
        summary = generate_summary(notes)
        follow_up = generate_follow_up(notes, sentiment)
        tags = generate_tags(notes, sentiment)

        interaction = models.Interaction(
            lead_id=data.get("lead_id"),
            notes=notes,
            summary=summary,
            sentiment=sentiment,
            follow_up=follow_up,
            tags=tags,
            follow_up_status="pending",
        )

        db.add(interaction)
        db.commit()
        db.refresh(interaction)

        return {
            "message": "Interaction logged successfully",
            "saved": True,
            "interaction_id": interaction.id,
            "lead_id": interaction.lead_id,
            "notes": interaction.notes,
            "summary": interaction.summary,
            "sentiment": interaction.sentiment,
            "follow_up": interaction.follow_up,
            "tags": interaction.tags,
            "follow_up_status": interaction.follow_up_status,
        }

    except Exception as e:
        db.rollback()

        return {
            "message": "Interaction logging failed",
            "error": str(e),
            "saved": False,
        }

    finally:
        db.close()


def edit_interaction_tool(interaction_id: int, updates: dict):
    db = SessionLocal()

    try:
        interaction = (
            db.query(models.Interaction)
            .filter(models.Interaction.id == interaction_id)
            .first()
        )

        if not interaction:
            return {
                "message": "Interaction update failed",
                "error": "Interaction not found",
            }

        if "notes" in updates:
            interaction.notes = normalize_notes(updates["notes"])

        if "summary" in updates:
            interaction.summary = updates["summary"]

        if "sentiment" in updates:
            interaction.sentiment = updates["sentiment"]

        if "follow_up" in updates:
            interaction.follow_up = updates["follow_up"]

        if "tags" in updates:
            interaction.tags = updates["tags"]

        if "follow_up_status" in updates:
            interaction.follow_up_status = updates["follow_up_status"]

        db.commit()
        db.refresh(interaction)

        return {
            "message": "Interaction updated successfully",
            "interaction_id": interaction.id,
            "lead_id": interaction.lead_id,
            "notes": interaction.notes,
            "summary": interaction.summary,
            "sentiment": interaction.sentiment,
            "follow_up": interaction.follow_up,
            "tags": interaction.tags,
            "follow_up_status": interaction.follow_up_status,
        }

    except Exception as e:
        db.rollback()

        return {
            "message": "Interaction update failed",
            "error": str(e),
        }

    finally:
        db.close()


def suggest_followups_tool(data: dict):
    db = SessionLocal()

    try:
        raw_notes = normalize_notes(data.get("notes") or "")
        raw_input = normalize_notes(
            data.get("input")
            or data.get("message")
            or data.get("query")
            or raw_notes
            or ""
        )

        lead_id = data.get("lead_id") or extract_lead_id_from_text(raw_input)

        lead_name = normalize_notes(
            data.get("lead_name")
            or data.get("name")
            or data.get("hcp_name")
            or data.get("doctor_name")
            or ""
        )

        # Extract name from prompts like:
        # "create a follow-up for Shrestha"
        if not lead_name:
            extracted_name = extract_name_after_for(raw_notes) or extract_name_after_for(raw_input)
            if extracted_name:
                lead_name = extracted_name
                raw_notes = ""

        # Extract name from prompts like:
        # "Shrestha lead ID 8"
        # "Shrestha, lead ID 8"
        if lead_id and not lead_name:
            id_match = re.search(
                r"\b(?:lead\s*)?id\s*[:#-]?\s*\d+\b",
                raw_input,
                re.IGNORECASE,
            )

            if id_match:
                possible_name = raw_input[:id_match.start()]
                possible_name = possible_name.replace(",", " ").strip()
                possible_name = normalize_notes(possible_name)

                # Avoid treating generic words as names.
                generic_words = [
                    "for",
                    "create",
                    "generate",
                    "make",
                    "follow",
                    "follow-up",
                    "followup",
                    "up",
                    "lead",
                    "id",
                ]

                possible_name_words = [
                    word for word in possible_name.split()
                    if word.lower() not in generic_words
                ]

                possible_name = normalize_notes(" ".join(possible_name_words))

                if possible_name:
                    lead_name = possible_name

        # Parser fallback:
        # If only a short name was sent as notes, treat it as lead lookup.
        # Example: notes = "Vikas" should not become interaction context.
        if not lead_name and raw_notes and len(raw_notes.split()) <= 4 and not lead_id:
            lead_name = raw_notes
            raw_notes = ""

        lead = None

        # Strict safety rule:
        # A bare lead ID is not enough in chat follow-up flow because the user may have
        # just been asked to choose among duplicate names.
        # Example bad case:
        # User asked for Shrestha, then typed "lead ID 9", but ID 9 belongs to Sheetal.
        if lead_id and not lead_name:
            lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()

            if not lead:
                return {
                    "message": "Follow-up generation failed",
                    "error": f"I couldn't find lead ID {lead_id}. Please check the lead ID and try again.",
                    "grounded": False,
                }

            return {
                "message": "Lead ID needs confirmation",
                "error": (
                    f"Lead ID {lead_id} belongs to {lead.name}. "
                    f"Please confirm with both name and ID, for example: '{lead.name} lead ID {lead.id}'."
                ),
                "grounded": False,
                "needs_confirmation": True,
                "lead": serialize_lead_for_choice(lead),
            }

        # Case 1: Lead ID + name provided.
        # Validate that the ID belongs to the named lead.
        if lead_id and lead_name:
            lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()

            if not lead:
                return {
                    "message": "Follow-up generation failed",
                    "error": f"I couldn't find lead ID {lead_id}. Please check the lead ID and try again.",
                    "grounded": False,
                }

            requested_name = lead_name.lower()
            actual_name = (lead.name or "").lower()

            if requested_name not in actual_name and actual_name not in requested_name:
                return {
                    "message": "Lead ID mismatch",
                    "error": (
                        f"Lead ID {lead_id} belongs to {lead.name}, not {lead_name}. "
                        f"Please use the correct lead ID for {lead_name} before generating a follow-up."
                    ),
                    "grounded": False,
                    "lead_id_mismatch": True,
                    "requested_name": lead_name,
                    "actual_lead": serialize_lead_for_choice(lead),
                }

        # Case 2: Name provided without ID.
        # Must handle duplicate names safely.
        elif lead_name:
            exact_matches = (
                db.query(models.Lead)
                .filter(func.lower(models.Lead.name) == lead_name.lower())
                .all()
            )

            matches = exact_matches

            if not matches:
                matches = (
                    db.query(models.Lead)
                    .filter(func.lower(models.Lead.name).like(f"%{lead_name.lower()}%"))
                    .all()
                )

            if not matches:
                return {
                    "message": "Follow-up generation failed",
                    "error": (
                        f"I couldn't find a lead or interaction history for {lead_name}. "
                        f"Please create the lead first before generating a follow-up."
                    ),
                    "grounded": False,
                }

            if len(matches) > 1:
                return {
                    "message": "Multiple matching leads found",
                    "error": (
                        f"I found multiple leads matching '{lead_name}'. "
                        f"Please specify both name and lead ID before generating a follow-up. "
                        f"Example: '{lead_name} lead ID {matches[0].id}'."
                    ),
                    "grounded": False,
                    "needs_disambiguation": True,
                    "matching_leads": [serialize_lead_for_choice(item) for item in matches],
                }

            lead = matches[0]

        else:
            return {
                "message": "Follow-up generation failed",
                "error": "Please mention an existing lead name before generating a follow-up.",
                "grounded": False,
            }

        # Existing lead found. Now require interaction history.
        latest_interaction = (
            db.query(models.Interaction)
            .filter(models.Interaction.lead_id == lead.id)
            .order_by(models.Interaction.id.desc())
            .first()
        )

        if not latest_interaction:
            return {
                "message": "Follow-up generation failed",
                "error": (
                    f"I found {lead.name} with lead ID {lead.id}, but there is no interaction history. "
                    f"Please log an interaction first before generating a follow-up."
                ),
                "grounded": False,
                "lead": serialize_lead_for_choice(lead),
            }

        notes = normalize_notes(latest_interaction.notes or "")

        if len(notes.split()) < 6:
            return {
                "message": "Follow-up generation failed",
                "error": (
                    f"I found {lead.name} with lead ID {lead.id}, but the available interaction history "
                    f"is not detailed enough to generate a grounded follow-up."
                ),
                "grounded": False,
                "lead": serialize_lead_for_choice(lead),
            }

        sentiment = detect_sentiment(notes)
        suggestions = generate_follow_up(notes, sentiment)
        tags = generate_tags(notes, sentiment)

        return {
            "message": "Follow-up suggestions generated",
            "suggestions": suggestions,
            "sentiment": sentiment,
            "tags": tags,
            "grounded": True,
            "source": {
                "lead_id": lead.id,
                "lead_name": lead.name,
                "lead_email": lead.email,
                "lead_phone": lead.phone,
                "notes": notes,
            },
        }

    except Exception as e:
        return {
            "message": "Follow-up generation failed",
            "error": str(e),
            "grounded": False,
        }

    finally:
        db.close()