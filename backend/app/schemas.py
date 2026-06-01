import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator, model_validator


VALID_STATUSES = {
    "new",
    "contacted",
    "qualified",
    "converted",
    "inactive",
}

VALID_DESIGNATIONS = {
    "doctor",
    "nurse",
    "pharmacist",
    "admin",
    "other",
}

DOCTOR_PREFIX_RE = re.compile(r"^\s*(dr\.?|doctor)\s*\.?\s*", re.IGNORECASE)


def clean_optional_text(value):
    if value is None:
        return None

    value = str(value).strip()
    return value or None


def has_doctor_prefix(value) -> bool:
    value = clean_optional_text(value)
    if not value:
        return False

    return bool(DOCTOR_PREFIX_RE.match(value))


def strip_doctor_prefix(value):
    value = clean_optional_text(value)

    if not value:
        return value

    return DOCTOR_PREFIX_RE.sub("", value).strip()


def format_name_token(token: str) -> str:
    token = clean_optional_text(token)

    if not token:
        return ""

    token = token.replace(".", "").strip()

    if not token:
        return ""

    # Preserve initials:
    # h -> H, j -> J, xj -> XJ
    if token.isalpha() and len(token) <= 2:
        return token.upper()

    return token[:1].upper() + token[1:].lower()


def is_initial_token(token: str) -> bool:
    token = clean_optional_text(token)

    if not token:
        return False

    token = token.replace(".", "").strip()

    return token.isalpha() and len(token) <= 2


def normalize_name_segment(value):
    value = clean_optional_text(value)

    if not value:
        return None

    value = strip_doctor_prefix(value)
    value = value.replace(".", " ")

    tokens = re.findall(r"[A-Za-z]+", value)

    if not tokens:
        return None

    return " ".join(format_name_token(token) for token in tokens)


def parse_full_name(value):
    """
    Supports AI/chat backward compatibility:
    "dr.sheetal" -> Sheetal, None, None
    "shreshta h j" -> Shreshta, None, H J
    "shreshta gowda h j" -> Shreshta, Gowda, H J
    """
    value = clean_optional_text(value)

    if not value:
        return None, None, None

    value = strip_doctor_prefix(value)
    value = value.replace(".", " ")

    tokens = re.findall(r"[A-Za-z]+", value)

    if not tokens:
        return None, None, None

    first_name = format_name_token(tokens[0])
    remaining = tokens[1:]

    initials = []

    while remaining and is_initial_token(remaining[-1]):
        initials.insert(0, remaining.pop())

    last_name = " ".join(format_name_token(token) for token in remaining) or None
    initials_value = " ".join(token.upper() for token in initials) or None

    return first_name, last_name, initials_value


def split_last_name_and_initials(value):
    """
    UI rule:
    First Name: Shreshta
    Last Name: Gowda H J

    Stores:
    last_name = Gowda
    initials = H J
    """
    value = clean_optional_text(value)

    if not value:
        return None, None

    value = value.replace(".", " ")
    tokens = re.findall(r"[A-Za-z]+", value)

    if not tokens:
        return None, None

    initials = []

    while tokens and is_initial_token(tokens[-1]):
        initials.insert(0, tokens.pop())

    last_name = " ".join(format_name_token(token) for token in tokens) or None
    initials_value = " ".join(token.upper() for token in initials) or None

    return last_name, initials_value


def build_display_name(first_name, last_name=None, initials=None):
    parts = []

    first_name = normalize_name_segment(first_name)
    last_name = normalize_name_segment(last_name)

    if first_name:
        parts.append(first_name)

    if last_name:
        parts.append(last_name)

    if initials:
        parts.append(initials)

    return " ".join(parts)


def validate_final_name(first_name, full_name):
    if not first_name:
        raise ValueError("First name is required")

    if len(first_name) < 2:
        raise ValueError("First name must contain at least 2 characters")

    if not re.search(r"[A-Za-z]", first_name):
        raise ValueError("First name must contain letters")

    if not full_name:
        raise ValueError("Name is required")

    return full_name


def validate_phone_number(value):
    value = clean_optional_text(value)

    if value is None:
        raise ValueError("Phone number is required")

    digits = re.sub(r"\D", "", value)

    if len(digits) != 10:
        raise ValueError(
            f"Phone number must contain exactly 10 digits. "
            f"You entered {len(digits)} digits."
        )

    return digits


def validate_status_value(value):
    value = clean_optional_text(value) or "new"
    value = value.lower()

    if value not in VALID_STATUSES:
        raise ValueError("Invalid lead status")

    return value


def validate_designation_value(value):
    value = clean_optional_text(value)

    if not value:
        return "other"

    value = value.lower()

    if value not in VALID_DESIGNATIONS:
        raise ValueError("Invalid HCP designation")

    return value


class LeadCreate(BaseModel):
    # Backward-compatible field for AI Copilot commands.
    # Example: "Create lead for Dr. Divya Sharma..."
    name: Optional[str] = None

    # Structured UI fields.
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    initials: Optional[str] = None

    email: EmailStr
    phone: str

    designation: Optional[str] = None
    status: Optional[str] = "new"

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        value = clean_optional_text(value)

        if not value:
            raise ValueError("Email is required")

        return value.lower()

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, value):
        return validate_phone_number(value)

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, value):
        return validate_status_value(value)

    @field_validator("designation", mode="before")
    @classmethod
    def validate_designation(cls, value):
        return validate_designation_value(value)

    @model_validator(mode="after")
    def normalize_name_fields(self):
        doctor_prefix_detected = has_doctor_prefix(self.name) or has_doctor_prefix(
            self.first_name
        )

        parsed_first = None
        parsed_last = None
        parsed_initials = None

        if self.name:
            parsed_first, parsed_last, parsed_initials = parse_full_name(self.name)

        first_name = normalize_name_segment(self.first_name) or parsed_first

        # Last name field may also contain initials, like "Gowda H J".
        raw_last_name = self.last_name or parsed_last
        last_name, initials_from_last = split_last_name_and_initials(raw_last_name)

        initials = initials_from_last or parsed_initials

        display_name = build_display_name(
            first_name=first_name,
            last_name=last_name,
            initials=initials,
        )

        validate_final_name(first_name, display_name)

        self.first_name = first_name
        self.last_name = last_name
        self.initials = initials
        self.name = display_name

        if doctor_prefix_detected:
            self.designation = "doctor"
        else:
            self.designation = validate_designation_value(self.designation)

        self.status = validate_status_value(self.status)

        return self


class LeadUpdate(BaseModel):
    # Accepted for compatibility but ignored in CRUD update.
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    initials: Optional[str] = None
    designation: Optional[str] = None

    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    status: Optional[str] = None

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        value = clean_optional_text(value)
        return value.lower() if value else None

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, value):
        if value is None:
            return None

        return validate_phone_number(value)

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, value):
        if value is None:
            return None

        return validate_status_value(value)

    @field_validator("designation", mode="before")
    @classmethod
    def validate_designation(cls, value):
        if value is None:
            return None

        return validate_designation_value(value)


class LeadResponse(BaseModel):
    id: int

    name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    initials: Optional[str] = None

    email: EmailStr
    phone: str

    designation: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True