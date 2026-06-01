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
FIELD_MARKER_RE = re.compile(
    r"\b(email|emails|e mail|mail|mails|email id|mail id|phone|mobile|number|contact|call|telephone|cell|designation|designated|role)\b",
    re.IGNORECASE,
)
DESIGNATION_FIELD_RE = re.compile(
    r"\b(?:designation|designated|role|as)\s*[:=\-]?\s*(doctor|dr|physician|nurse|pharmacist|admin|administrator|other)\b",
    re.IGNORECASE,
)

FILLER_WORDS = {
    "can", "you", "could", "please", "kindly",
    "create", "make", "add", "register", "save", "store",
    "new", "lead", "contact", "crm", "customer", "prospect",
    "doctor", "dr", "hcp", "physician", "nurse", "pharmacist",
    "admin", "administrator", "other", "designation", "designated", "role",
    "for", "with", "email", "emails", "mail", "mails", "e",
    "phone", "number", "mobile", "called", "named", "name",
    "a", "an", "the", "me",
    "as", "and", "at", "dot", "gmail", "yahoo",
    "outlook", "hotmail", "icloud", "com", "in",
    "start", "stop", "full", "rate", "symbol", "sign",
    "his", "her", "their", "is", "this", "that", "to", "of",
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

DESIGNATION_ALIASES = {
    "dr": "doctor",
    "doctor": "doctor",
    "physician": "doctor",
    "nurse": "nurse",
    "pharmacist": "pharmacist",
    "admin": "admin",
    "administrator": "admin",
    "other": "other",
}

VALID_DESIGNATIONS = {"doctor", "nurse", "pharmacist", "admin", "other"}


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

    # Prevent names like "Dr.Divya" after dot normalization.
    normalized = re.sub(r"\bdr\.\s*", "Dr ", normalized, flags=re.IGNORECASE)

    return " ".join(normalized.split())


def remove_instruction_phrases(text: str) -> str:
    text = re.sub(
        r"\b(the\s+)?name\s+should\s+be\s+(in\s+)?(capital|capitol|uppercase|upper\s+case|lowercase|lower\s+case)(\s+letters?)?\b",
        " ",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"\b(in\s+)?(capital|capitol|uppercase|upper\s+case|lowercase|lower\s+case)(\s+letters?)?\b",
        " ",
        text,
        flags=re.IGNORECASE,
    )
    return " ".join(text.split())


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


def normalize_designation(value: str) -> str:
    key = (value or "").strip().lower().replace(".", "")
    return DESIGNATION_ALIASES.get(key, "")


def extract_designation(text: str) -> str:
    normalized = normalize_voice_text(text)

    explicit_match = DESIGNATION_FIELD_RE.search(normalized)
    if explicit_match:
        designation = normalize_designation(explicit_match.group(1))
        if designation in VALID_DESIGNATIONS:
            return designation

    # Doctor prefix should automatically map to doctor.
    if re.search(r"\b(?:dr|doctor|physician)\.?\s+[A-Za-z]", normalized, flags=re.IGNORECASE):
        return "doctor"

    return ""


def strip_designation_text(text: str) -> str:
    text = DESIGNATION_FIELD_RE.sub(" ", text or "")
    return " ".join(text.split())


def clean_name_words(text: str, preserve_case: bool = False) -> str:
    text = remove_instruction_phrases(text)
    text = strip_designation_text(text)
    text = re.sub(r"\bdr\.?\b", " ", text, flags=re.IGNORECASE)
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
    normalized = normalize_voice_text(text)
    terminator = r"(?=\s+(?:email|emails|e mail|mail|mails|email id|mail id|phone|mobile|number|contact|call|telephone|cell|designation|designated|role)\b|@|\d|$)"

    patterns = [
        rf"\bname\s*[:=\-]\s*([A-Za-z .]+?){terminator}",
        rf"\bname\s+(?:is|as)\s+([A-Za-z .]+?){terminator}",
        rf"\bnamed\s*(?:as|is|[:=\-])?\s*([A-Za-z .]+?){terminator}",
        rf"\bcalled\s*(?:as|is|[:=\-])?\s*([A-Za-z .]+?){terminator}",
    ]

    all_matches = []
    for pattern in patterns:
        all_matches.extend(list(re.finditer(pattern, normalized, flags=re.IGNORECASE)))

    if not all_matches:
        return ""

    latest_match = max(all_matches, key=lambda match: match.start())
    raw_name = latest_match.group(1).strip()

    return clean_name_words(raw_name, preserve_case=True)


def make_email_from_words(local_raw: str, domain: str, tld: str) -> str:
    tokens = re.findall(r"[a-zA-Z0-9]+", local_raw or "")

    marker_indexes = [
        i for i, token in enumerate(tokens)
        if token.lower() in {"email", "emails", "mail", "mails", "e", "as", "at"}
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


def remove_known_field_values(text: str) -> str:
    normalized = normalize_voice_text(text)
    normalized = EMAIL_RE.sub(" ", normalized)
    normalized = DOMAIN_RE.sub(" ", normalized)
    normalized = re.sub(r"(?<!\w)(?:\+?\d[\d\s\-().]*){5,}(?!\w)", " ", normalized)
    normalized = DESIGNATION_FIELD_RE.sub(" ", normalized)
    normalized = FIELD_MARKER_RE.sub(" ", normalized)
    normalized = remove_instruction_phrases(normalized)
    return " ".join(normalized.split())


def extract_fallback_name(text: str) -> str:
    cleaned = remove_known_field_values(text)

    marker_patterns = [
        r"\bfor\s+([A-Za-z .]+)$",
        r"\blead\s+for\s+([A-Za-z .]+)$",
        r"\bcontact\s+for\s+([A-Za-z .]+)$",
        r"\bdoctor\s+([A-Za-z .]+)$",
        r"\bdr\.?\s+([A-Za-z .]+)$",
    ]

    for pattern in marker_patterns:
        match = re.search(pattern, cleaned, flags=re.IGNORECASE)
        if match:
            name = clean_name_words(match.group(1), preserve_case=False)
            if name:
                return name

    return clean_name_words(cleaned, preserve_case=False)


def sanitize_name(raw_name: str, original_text: str) -> str:
    explicit_name = extract_explicit_name(original_text)

    if explicit_name:
        return explicit_name

    source = raw_name or original_text or ""
    return extract_fallback_name(source)


def extract_lead_details(text: str) -> dict:
    normalized = normalize_voice_text(text)

    explicit_name = extract_explicit_name(normalized)
    regex_email = extract_email(normalized)
    phone_info = extract_phone_info(normalized)
    fallback_name = extract_fallback_name(normalized)
    detected_designation = extract_designation(normalized)

    prompt = f"""
You are an AI CRM entity extraction engine.

Extract ONLY these CRM lead fields from the user message:
- name
- email
- phone
- designation

Return ONLY valid JSON with keys: name, email, phone, designation.

Rules:
- Understand natural typed or voice text like ChatGPT.
- Extract only actual field values, not instructions.
- Ignore instruction phrases like "the name should be in capital letters".
- If the input contains markers like "name:", "name is", "named", "named as", or "called", use only the value after that marker as name.
- Stop name extraction before email/email(s)/mail/phone/mobile/number/contact/call/designation markers.
- Convert spoken email like "divya at gmail dot com" into "divya@gmail.com".
- Email must always be lowercase.
- Keep the full phone digit string. Never trim phone numbers.
- If phone has spaces, join the digits.
- If designation is written as doctor, nurse, pharmacist, admin, or other, extract it.
- If name starts with Dr. or Doctor, set designation to doctor and remove Dr./Doctor from the name.
- If designation is missing, return empty string.
- If email is missing, return empty string.
- If phone is missing, return empty string.

Examples:

Input: "Create a lead for Dr. Divya Sharma email divya@gmail.com phone 9876543212"
Output: {{"name":"Divya Sharma","email":"divya@gmail.com","phone":"9876543212","designation":"doctor"}}

Input: "Create a lead for Shreshta Gowda H J email shreshta@gmail.com phone 9876543212 designation pharmacist"
Output: {{"name":"Shreshta Gowda H J","email":"shreshta@gmail.com","phone":"9876543212","designation":"pharmacist"}}

Input: "Create lead for Ravi phone 123456789012 designation nurse"
Output: {{"name":"Ravi","email":"","phone":"123456789012","designation":"nurse"}}

User input: {normalized}
"""

    fallback_json = json.dumps(
        {
            "name": explicit_name or fallback_name,
            "email": regex_email,
            "phone": phone_info["phone"],
            "designation": detected_designation,
        }
    )

    response = invoke_llm(prompt, fallback=fallback_json)

    try:
        data = json.loads(clean_json_response(response))
    except Exception:
        data = {}

    llm_name = sanitize_name(data.get("name", ""), normalized)

    name = explicit_name or llm_name or fallback_name
    email = (data.get("email", "") or regex_email or "").strip().lower()
    phone = (data.get("phone", "") or phone_info["phone"] or "").strip()
    designation = detected_designation or normalize_designation(data.get("designation", ""))

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

    if not designation and not validation_error:
        validation_error = "Please specify the HCP designation: doctor, nurse, pharmacist, admin, or other."

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "designation": designation,
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
                "designation": lead_data.get("designation", ""),
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
