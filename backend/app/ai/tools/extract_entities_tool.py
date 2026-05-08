import json
import re
from app.ai.core.llm import invoke_llm


def extract_entities_tool(data: dict):
    text = data.get("notes") or data.get("text") or ""
    prompt = f"""
Extract entities from this HCP CRM note. Return ONLY JSON with keys: hcp_name, product, sentiment, request, follow_up.
Text: {text}
"""
    fallback = json.dumps({"hcp_name": "", "product": "", "sentiment": "neutral", "request": "", "follow_up": ""})
    try:
        content = invoke_llm(prompt, fallback=fallback).replace("```json", "").replace("```", "").strip()
        return {"message": "Entities extracted", "entities": json.loads(content)}
    except Exception:
        email = re.findall(r"[\w\.-]+@[\w\.-]+\.\w+", text)
        return {"message": "Entities extracted", "entities": {"hcp_name": "", "product": "", "sentiment": "neutral", "request": "", "follow_up": "", "emails": email}}
