from app.ai.core.llm import invoke_llm


def summarize_tool(data: dict):
    text = data.get("notes") or data.get("text") or ""
    if not text:
        return {"message": "Summary failed", "error": "No text provided"}
    summary = invoke_llm(f"Summarize this CRM/HCP interaction in one concise sentence:\n{text}", fallback=text[:160])
    return {"message": "Summary generated", "summary": summary}
