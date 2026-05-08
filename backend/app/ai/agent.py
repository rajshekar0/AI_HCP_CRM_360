import re
from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from app.ai.core.llm import invoke_llm
from app.ai.state import AgentState
from app.ai.nodes.parser import parser
from app.ai.nodes.tools_node import tool_executor


load_dotenv()


EMAIL_OR_DOMAIN_RE = re.compile(
    r"(@|\b(gmail|yahoo|outlook|hotmail|icloud)\b|\bemail\b|\bmail\b)",
    re.IGNORECASE,
)

PHONE_RE = re.compile(r"(?:\d[\s\-().]*){10,}")

PHONE_WORD_RE = re.compile(
    r"\b(phone|mobile|number|contact|call|telephone|cell)\b",
    re.IGNORECASE,
)

NAME_HINT_RE = re.compile(
    r"\b(name|called|named|for|doctor|dr|hcp|physician)\b",
    re.IGNORECASE,
)


def router(state: AgentState):
    text = state.get("input", "") or ""
    lower = text.lower()

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
    has_name_hint = bool(NAME_HINT_RE.search(text))

    # Clear create-lead command:
    # "Create lead for Divya..."
    # "Add contact Ravi phone..."
    if has_create_intent and (
        has_lead_word or has_email_hint or has_phone_hint or has_name_hint
    ):
        return {
            **state,
            "action": "create_lead",
        }

    # Natural lead-like text without exact command:
    # "Divya Sharma email divya@gmail.com phone 9876543210"
    if (
        (has_email_hint or has_phone_hint)
        and not any(
            x in lower
            for x in ["summarize", "suggest", "follow up", "followup", "interaction"]
        )
    ):
        return {
            **state,
            "action": "create_lead",
        }

    if "log" in lower and "interaction" in lower:
        return {
            **state,
            "action": "log_interaction",
        }

    if "doctor discussed" in lower or "meeting notes" in lower:
        return {
            **state,
            "action": "log_interaction",
        }

    if ("edit" in lower or "update" in lower) and "interaction" in lower:
        return {
            **state,
            "action": "edit_interaction",
        }

    if any(
        phrase in lower
        for phrase in [
            "suggest",
            "follow up",
            "followup",
            "follow ups",
            "next action",
            "next step",
        ]
    ):
        return {
            **state,
            "action": "suggest_followups",
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

    prompt = f"""
Classify this CRM input into one action only:
create_lead, log_interaction, edit_interaction, suggest_followups, summarize, extract_entities, general_chat

Guidance:
- If the user gives a person's name with email/phone details, classify as create_lead.
- If the user asks to create/add/save/register a lead/contact/doctor/HCP, classify as create_lead.
- If the user describes a doctor/HCP discussion, classify as log_interaction.
- If the user asks for next steps or follow-ups, classify as suggest_followups.
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