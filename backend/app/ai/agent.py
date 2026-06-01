import re
from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from app.ai.core.llm import invoke_llm
from app.ai.state import AgentState
from app.ai.nodes.parser import parser
from app.ai.nodes.tools_node import tool_executor


load_dotenv()


EMAIL_OR_DOMAIN_RE = re.compile(
    r"(@|\b(gmail|yahoo|outlook|hotmail|icloud)\b|\bemail\b|\bemails\b|\bmail\b|\bmails\b)",
    re.IGNORECASE,
)

PHONE_RE = re.compile(r"(?:\d[\s\-().]*){10,}")

PHONE_WORD_RE = re.compile(
    r"\b(phone|mobile|number|contact|call|telephone|cell)\b",
    re.IGNORECASE,
)

FOLLOW_UP_RE = re.compile(
    r"\b("
    r"follow[\s-]?up|"
    r"followups|"
    r"follow ups|"
    r"follow-ups|"
    r"folloe[\s-]?up|"
    r"follw[\s-]?up|"
    r"folow[\s-]?up|"
    r"followp|"
    r"next action|"
    r"next step|"
    r"reminder|"
    r"call back|"
    r"callback"
    r")\b",
    re.IGNORECASE,
)

LEAD_ID_RE = re.compile(
    r"\b(?:lead\s*)?id\s*[:#-]?\s*\d+\b",
    re.IGNORECASE,
)

INTERACTION_RE = re.compile(
    r"\b(interaction|meeting|discussion|doctor discussed|hcp discussed|notes|visit|met dr|met doctor)\b",
    re.IGNORECASE,
)


def looks_like_follow_up_request(text: str) -> bool:
    lower = (text or "").lower()

    follow_up_phrases = [
        "follow up",
        "follow-up",
        "followup",
        "follow ups",
        "follow-ups",
        "folloe up",
        "folloe-up",
        "follw up",
        "follw-up",
        "folow up",
        "folow-up",
        "followp",
        "next step",
        "next action",
        "callback",
        "call back",
        "reminder",
    ]

    return any(phrase in lower for phrase in follow_up_phrases)


def looks_like_lead_id_clarification(text: str) -> bool:
    lower = (text or "").lower().strip()

    if not LEAD_ID_RE.search(lower):
        return False

    # These are clarification-style inputs after duplicate lead disambiguation.
    clarification_patterns = [
        r"^\s*(?:lead\s*)?id\s*[:#-]?\s*\d+\s*$",
        r"^\s*for\s+(?:lead\s*)?id\s*[:#-]?\s*\d+\s*$",
        r"^\s*[\w\s.-]+,\s*(?:lead\s*)?id\s*[:#-]?\s*\d+\s*$",
        r"^\s*[\w\s.-]+\s+(?:lead\s*)?id\s*[:#-]?\s*\d+\s*$",
    ]

    return any(re.search(pattern, lower, re.IGNORECASE) for pattern in clarification_patterns)


def router(state: AgentState):
    text = state.get("input", "") or ""
    lower = text.lower()

    # Critical safety route:
    # Follow-up requests must never become lead creation.
    # Example: "create a follow-up note for Sheetal"
    # Example typo: "create a folloe up for prathik"
    if FOLLOW_UP_RE.search(text) or looks_like_follow_up_request(text):
        return {
            **state,
            "action": "suggest_followups",
        }

    # Critical disambiguation route:
    # After "multiple leads found", user may reply with "lead ID 9".
    # This must continue follow-up generation, not create a new lead.
    if looks_like_lead_id_clarification(text):
        return {
            **state,
            "action": "suggest_followups",
        }

    if "log" in lower and "interaction" in lower:
        return {
            **state,
            "action": "log_interaction",
        }

    if INTERACTION_RE.search(text) and not EMAIL_OR_DOMAIN_RE.search(text):
        return {
            **state,
            "action": "log_interaction",
        }

    if ("edit" in lower or "update" in lower) and "interaction" in lower:
        return {
            **state,
            "action": "edit_interaction",
        }

    if "summarize" in lower or "summary" in lower:
        return {
            **state,
            "action": "summarize",
        }

    if "extract" in lower or "entities" in lower:
        return {
            **state,
            "action": "extract_entities",
        }

    create_words = [
        "create",
        "add",
        "register",
        "save",
        "store",
        "make",
        "new",
        "insert",
    ]

    lead_words = [
        "lead",
        "contact",
        "doctor",
        "dr",
        "hcp",
        "physician",
        "customer",
        "prospect",
    ]

    has_create_intent = any(word in lower for word in create_words)
    has_lead_word = any(word in lower for word in lead_words)
    has_email_hint = bool(EMAIL_OR_DOMAIN_RE.search(text))
    has_phone_hint = bool(PHONE_RE.search(text) or PHONE_WORD_RE.search(text))

    # Create lead only when the prompt clearly contains lead/contact intent
    # or usable contact details. Do not use "for <name>" as lead intent.
    # Do not treat "lead id 9" as create_lead.
    if (
        has_create_intent
        and (has_lead_word or has_email_hint or has_phone_hint)
        and not LEAD_ID_RE.search(text)
        and not looks_like_follow_up_request(text)
    ):
        return {
            **state,
            "action": "create_lead",
        }

    # Natural lead-like text:
    # Example: "Divya Sharma email divya@gmail.com phone 9876543210"
    if (
        (has_email_hint or has_phone_hint)
        and not LEAD_ID_RE.search(text)
        and not looks_like_follow_up_request(text)
        and not any(
            x in lower
            for x in [
                "summarize",
                "summary",
                "suggest",
                "interaction",
                "meeting",
                "discussion",
            ]
        )
    ):
        return {
            **state,
            "action": "create_lead",
        }

    prompt = f"""
Classify this CRM input into one action only:
create_lead, log_interaction, edit_interaction, suggest_followups, summarize, extract_entities, general_chat

Guidance:
- If the user explicitly asks to create/add/save/register a lead/contact/doctor/HCP with name/contact details, classify as create_lead.
- If the user gives a person's name with email/phone details, classify as create_lead.
- If the user asks for a follow-up note, follow-up action, next step, reminder, callback, or anything similar to "follow up" even with spelling mistakes, classify as suggest_followups.
- If the user provides only a lead ID, such as "lead ID 9" or "Shreista lead ID 8", classify as suggest_followups.
- Never classify "create a follow-up..." as create_lead. It must be suggest_followups.
- Never classify "lead ID 9" as create_lead. It must be suggest_followups.
- If the user describes a doctor/HCP meeting or field discussion, classify as log_interaction.
- If none of these apply, classify as general_chat.

Input: {text}

Return only the action word.
"""

    action = invoke_llm(prompt, fallback="general_chat").strip().lower()

    valid_actions = {
        "create_lead",
        "log_interaction",
        "edit_interaction",
        "suggest_followups",
        "summarize",
        "extract_entities",
        "general_chat",
    }

    if action not in valid_actions:
        action = "general_chat"

    # Final safety overrides:
    if looks_like_follow_up_request(text):
        action = "suggest_followups"

    if looks_like_lead_id_clarification(text):
        action = "suggest_followups"

    if LEAD_ID_RE.search(text) and action == "create_lead":
        action = "suggest_followups"

    return {
        **state,
        "action": action,
    }


def respond(state: AgentState):
    return {
        **state,
        "messages": [state.get("result")],
    }


graph = StateGraph(AgentState)

graph.add_node("router", router)
graph.add_node("parser", parser)
graph.add_node("tool", tool_executor)
graph.add_node("respond", respond)

graph.set_entry_point("router")

graph.add_edge("router", "parser")
graph.add_edge("parser", "tool")
graph.add_edge("tool", "respond")
graph.add_edge("respond", END)

app = graph.compile()