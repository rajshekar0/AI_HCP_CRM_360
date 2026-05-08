import os
from dotenv import load_dotenv

load_dotenv()


def _build_llm():
    try:
        from langchain_groq import ChatGroq

        api_key = os.getenv("GROQ_API_KEY")
        model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
        if not api_key:
            return None
        return ChatGroq(api_key=api_key, model=model, temperature=0)
    except Exception:
        return None


llm = _build_llm()


def invoke_llm(prompt: str, fallback: str = "") -> str:
    if llm is None:
        return fallback
    try:
        return llm.invoke(prompt).content.strip()
    except Exception:
        return fallback
