import json
import re
from app.ai.state import AgentState
from app.ai.core.llm import invoke_llm


EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
DOMAIN_RE = re.compile(
    r"\b(gmail|yahoo|outlook|hotmail|icloud)\s*\.?\s*(com|in|net|org)\b",
    re.IGNORECASE,
)
PHONE_KEYWORD_RE = re.compile(
    r"\b(phone|mobile|number|contact|call|telephone|cell)\b",
    re.IGNORECASE,
)

FILLER_WORDS = {
    "can", "you", "could", "please", "kindly",
    "create", "make", "add", "register", "save", "store",
    "new", "lead", "contact", "crm", "customer", "prospect",
    "doctor", "dr", "hcp", "physician",
    "for", "with", "email", "mail", "e",
    "phone", "number", "mobile", "called", "named", "name",
    "a", "an", "the", "me",
    "as", "and", "at", "dot", "gmail", "yahoo",
    "outlook", "hotmail", "icloud", "com", "in",
    "start", "stop", "full", "rate", "symbol", "sign",
    "his", "her", "their", "is", "this", "that", "to", "of",

    # Extra natural-language instruction words.
    # These prevent phrases like:
    # "the name should be in capital letters name: SHRESHTA"
    # from becoming part of the stored lead name.
    "should", "be", "capital", "capitol", "letters", "letter",
    "uppercase", "upper", "case", "lowercase", "lower",
}

SPOKEN_DIGITS = {
    "zero": "0",
    "oh": "0",
    "o": "0",
    "one": "1",
    "two": "2",
    "three": "3",
    "four": "4",
    "five": "5",
    "six": "6",
    "seven": "7",
    "eight": "8",
    "nine": "9",
}


def clean_json_response(text: str) -> str:
    return (text or "").strip().replace("```json", "").replace("```", "").strip()


def normalize_voice_text(text: str) -> str:
    normalized = f" {text or ''} "

    replacements = [
        (r"\bat\s+the\s+rate\b", "@"),
        (r"\bat\s+rate\b", "@"),
        (r"\bat\s+symbol\b", "@"),
        (r"\bat\s+sign\b", "@"),
        (r"\bstart\b", "at"),
        (r"\bunderscore\b", "_"),
        (r"\bhyphen\b", "-"),
        (r"\bdash\b", "-"),
        (r"\bdot\b", "."),
        (r"\bpoint\b", "."),
        (r"\bfull\s+stop\b", "."),
        (r"\bg\s*mail\b", "gmail"),
    ]

    for pattern, value in replacements:
        normalized = re.sub(pattern, value, normalized, flags=re.IGNORECASE)

    normalized = re.sub(r"\s*@\s*", "@", normalized)
    normalized = re.sub(r"\s*\.\s*", ".", normalized)

    return " ".join(normalized.split())


def remove_duplicate_words(words):
    result = []
    seen = set()

    for word in words:
        key = word.lower()

        if key in seen:
            continue

        seen.add(key)
        result.append(word)

    return result


def clean_name_words(text: str, preserve_case: bool = False) -> str:
    text = re.sub(r"[^a-zA-Z\s.]", " ", text)

    words = []

    for word in text.split():
        clean = word.strip(". ")

        if not clean:
            continue

        if clean.lower() in FILLER_WORDS:
            continue

        words.append(clean)

    words = remove_duplicate_words(words)
    name = " ".join(words).strip()

    if not name:
        return ""

    if preserve_case:
        return name

    return name.title()


def extract_explicit_name(text: str) -> str:
    """
    Extracts only the value after explicit name markers.

    Handles:
    NAME: SHRESHTA EMAIL SHRESHTA@GMAIL.COM PHONE 9901070679
    name - Divya Sharma email divya@gmail.com
    name is Ravi Kumar phone 9876543210
    """
    normalized = normalize_voice_text(text)

    patterns = [
        r"\bname\s*[:=\-]\s*([A-Za-z .]+?)(?=\s+(?:email|e mail|mail|phone|mobile|number|contact|call)\b|@|\d|$)",
        r"\bname\s+is\s+([A-Za-z .]+?)(?=\s+(?:email|e mail|mail|phone|mobile|number|contact|call)\b|@|\d|$)",
        r"\bnamed\s+([A-Za-z .]+?)(?=\s+(?:email|e mail|mail|phone|mobile|number|contact|call)\b|@|\d|$)",
        r"\bcalled\s+([A-Za-z .]+?)(?=\s+(?:email|e mail|mail|phone|mobile|number|contact|call)\b|@|\d|$)",
    ]

    for pattern in patterns:
        matches = list(re.finditer(pattern, normalized, flags=re.IGNORECASE))

        if not matches:
            continue

        # Use the last explicit name marker.
        # Example:
        # "the name should be capital letters name: SHRESHTA"
        # We want the second "name:" value, not the first instruction phrase.
        raw_name = matches[-1].group(1).strip()
        cleaned = clean_name_words(raw_name, preserve_case=True)

        if cleaned:
            return cleaned

    return ""


def make_email_from_words(local_raw: str, domain: str, tld: str) -> str:
    tokens = re.findall(r"[a-zA-Z0-9]+", local_raw or "")

    marker_indexes = [
        i for i, token in enumerate(tokens)
        if token.lower() in {"email", "mail", "e", "as", "at"}
    ]

    if marker_indexes:
        tokens = tokens[marker_indexes[-1] + 1:]

    tokens = [token for token in tokens if token.lower() not in FILLER_WORDS]

    if not tokens:
        return ""

    local_part = "".join(tokens[-3:]).lower()

    return f"{local_part}@{domain.lower()}.{tld.lower()}"


def extract_email(text: str) -> str:
    normalized = normalize_voice_text(text)

    spoken_at_match = re.search(
        r"\b([a-zA-Z0-9._%+-]+)\s+at\s+(gmail|yahoo|outlook|hotmail|icloud)\.(com|in|net|org)\b",
        normalized,
        flags=re.IGNORECASE,
    )

    if spoken_at_match:
        return (
            f"{spoken_at_match.group(1).lower()}"
            f"@{spoken_at_match.group(2).lower()}"
            f".{spoken_at_match.group(3).lower()}"
        )

    direct_match = EMAIL_RE.search(normalized)

    if direct_match:
        return direct_match.group(0).lower()

    domain_match = DOMAIN_RE.search(normalized)

    if not domain_match:
        return ""

    prefix = normalized[:domain_match.start()]

    return make_email_from_words(
        prefix,
        domain_match.group(1),
        domain_match.group(2),
    )


def spoken_digit_sequence_to_number(text: str) -> str:
    words = re.findall(r"[a-zA-Z]+", text.lower())
    digits = []

    for word in words:
        if word in SPOKEN_DIGITS:
            digits.append(SPOKEN_DIGITS[word])
        elif digits:
            break

    return "".join(digits)


def extract_phone_info(text: str) -> dict:
    """
    Strict rule:
    - exactly 10 digits = valid
    - 0 digits = phone missing
    - less than 10 or more than 10 = invalid
    - never crop 12 digits into 10 digits
    """
    normalized = normalize_voice_text(text)
    text_without_email = EMAIL_RE.sub(" ", normalized)

    candidates = []

    for match in re.finditer(
        r"(?<!\w)(?:\+?\d[\d\s\-().]*){5,}(?!\w)",
        text_without_email,
    ):
        digits = re.sub(r"\D", "", match.group(0))

        if digits:
            candidates.append(digits)

    keyword_match = PHONE_KEYWORD_RE.search(text_without_email)

    if keyword_match:
        after_keyword = text_without_email[keyword_match.end():]
        spoken_digits = spoken_digit_sequence_to_number(after_keyword)

        if spoken_digits:
            candidates.append(spoken_digits)

    if not candidates:
        return {
            "phone": "",
            "error": "",
        }

    phone = max(candidates, key=len)

    if len(phone) == 10:
        return {
            "phone": phone,
            "error": "",
        }

    return {
        "phone": phone,
        "error": f"Phone number must contain exactly 10 digits. You entered {len(phone)} digits.",
    }


def sanitize_name(raw_name: str, original_text: str) -> str:
    explicit_name = extract_explicit_name(original_text)

    if explicit_name:
        return explicit_name

    source = raw_name or original_text or ""
    text = normalize_voice_text(source)

    text = EMAIL_RE.sub(" ", text)

    marker = re.search(
        r"(@|\b(email|e mail|mail|phone|mobile|number|gmail|yahoo|outlook|hotmail|icloud)\b|\d)",
        text,
        flags=re.IGNORECASE,
    )

    if marker:
        text = text[:marker.start()]

    return clean_name_words(text, preserve_case=False)


def extract_lead_details(text: str) -> dict:
    normalized = normalize_voice_text(text)

    explicit_name = extract_explicit_name(normalized)
    regex_email = extract_email(normalized)
    phone_info = extract_phone_info(normalized)
    fallback_name = sanitize_name(normalized, normalized)

    prompt = f"""
You are an AI CRM entity extraction engine.

Extract ONLY these fields from the user message:
- name
- email
- phone

Return ONLY valid JSON with keys: name, email, phone.

Rules:
- Understand natural typed or voice text like ChatGPT.
- Extract only required CRM lead details.
- Ignore user instruction phrases like "the name should be in capital letters".
- If the input contains "name:" or "name is", use only the value after that marker as the name.
- Remove command/filler words: create, add, lead, contact, please, as, and, at, dot.
- Convert spoken email like "divya at gmail dot com" into "divya@gmail.com".
- Email must always be lowercase.
- If phone is present, keep the full digit string.
- Never trim phone numbers.
- If phone has spaces, join the digits.
- If email is missing, return empty string.
- If phone is missing, return empty string.

Examples:

Input: "Create a lead for Divya Sharma email divya at gmail dot com phone 997284 8672"
Output: {{"name":"Divya Sharma","email":"divya@gmail.com","phone":"9972848672"}}

Input: "CREATE ME A LEAD THE NAME SHOULD BE IN CAPITAL LETTERS NAME: SHRESHTA EMAIL SHRESHTA@GMAIL.COM PHONE: 9901070679"
Output: {{"name":"SHRESHTA","email":"shreshta@gmail.com","phone":"9901070679"}}

Input: "As Divya Sharma Divya And 997284 8672"
Output: {{"name":"Divya Sharma","email":"","phone":"9972848672"}}

Input: "Create lead for Ravi phone 123456789012"
Output: {{"name":"Ravi","email":"","phone":"123456789012"}}

User input: {normalized}
"""

    fallback_json = json.dumps(
        {
            "name": explicit_name or fallback_name,
            "email": regex_email,
            "phone": phone_info["phone"],
        }
    )

    response = invoke_llm(prompt, fallback=fallback_json)

    try:
        data = json.loads(clean_json_response(response))
    except Exception:
        data = {}

    llm_name = sanitize_name(data.get("name", ""), normalized)

    # Explicit marker wins over LLM result.
    # This fixes:
    # "THE NAME SHOULD BE IN CAPITOL LETTERS NAME: SHRESHTA..."
    name = explicit_name or llm_name or fallback_name

    email = (data.get("email", "") or regex_email or "").strip().lower()
    phone = (data.get("phone", "") or phone_info["phone"] or "").strip()

    if regex_email:
        email = regex_email.lower()

    if phone_info["phone"]:
        phone = phone_info["phone"]

    validation_error = phone_info["error"]

    if phone and not phone_info["phone"]:
        digits = re.sub(r"\D", "", phone)
        phone = digits

        if len(digits) != 10:
            validation_error = (
                f"Phone number must contain exactly 10 digits. "
                f"You entered {len(digits)} digits."
            )

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "validation_error": validation_error,
    }


def parser(state: AgentState):
    action = state.get("action")
    text = state.get("input", "")

    if action == "create_lead":
        lead_data = extract_lead_details(text)

        return {
            **state,
            "parsed": {
                "action": "create_lead",
                "name": lead_data["name"],
                "email": lead_data["email"],
                "phone": lead_data["phone"],
                "status": "new",
                "validation_error": lead_data.get("validation_error", ""),
            },
        }

    if action == "log_interaction":
        interaction_text = re.sub(
            r"log interaction[:\-]?",
            "",
            text,
            flags=re.IGNORECASE,
        ).strip()

        return {
            **state,
            "parsed": {
                "action": "log_interaction",
                "lead_id": None,
                "notes": interaction_text,
            },
        }

    if action == "edit_interaction":
        return {
            **state,
            "parsed": {
                "action": "edit_interaction",
                "interaction_id": 1,
                "updates": {
                    "notes": text,
                },
            },
        }

    if action == "suggest_followups":
        clean_text = re.sub(
            r"suggest follow ups? for this interaction[:\-]?",
            "",
            text,
            flags=re.IGNORECASE,
        ).strip()

        return {
            **state,
            "parsed": {
                "action": "suggest_followups",
                "notes": clean_text or text,
            },
        }

    if action == "summarize":
        return {
            **state,
            "parsed": {
                "action": "summarize",
                "notes": text,
            },
        }

    if action == "extract_entities":
        return {
            **state,
            "parsed": {
                "action": "extract_entities",
                "notes": text,
            },
        }

    return {
        **state,
        "parsed": {
            "action": action,
        },
    }