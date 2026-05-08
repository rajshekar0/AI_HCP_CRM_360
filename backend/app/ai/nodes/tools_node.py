from app.ai.tools import create_lead_tool, log_interaction_tool, edit_interaction_tool, suggest_followups_tool, summarize_tool, extract_entities_tool


def tool_executor(state):
    parsed = state.get("parsed", {}) or {}
    action = parsed.get("action") or state.get("action")

    if action == "create_lead":
        result = create_lead_tool(parsed)
    elif action == "log_interaction":
        result = log_interaction_tool(parsed)
    elif action == "edit_interaction":
        result = edit_interaction_tool(parsed.get("interaction_id"), parsed.get("updates", {}))
    elif action == "suggest_followups":
        result = suggest_followups_tool(parsed)
    elif action == "summarize":
        result = summarize_tool(parsed)
    elif action == "extract_entities":
        result = extract_entities_tool(parsed)
    else:
        result = {"message": "General chat response", "action": action}

    return {**state, "result": result}
