import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator


VALID_STATUSES = {
    "new",
    "contacted",
    "qualified",
    "converted",
    "inactive",
}


def clean_optional_text(value):
    if value is None:
        return None

    value = str(value).strip()
    return value or None


def validate_name(value):
    value = clean_optional_text(value)

    if not value:
        raise ValueError("Name is required")

    if len(value) < 2:
        raise ValueError("Name must contain at least 2 characters")

    if not re.search(r"[A-Za-z]", value):
        raise ValueError("Name must contain letters")

    return " ".join(value.split())


def validate_phone_number(value):
    value = clean_optional_text(value)

    if value is None:
        return None

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


class LeadCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    status: Optional[str] = "new"

    @field_validator("name", mode="before")
    @classmethod
    def validate_required_name(cls, value):
        return validate_name(value)

    @field_validator("email", mode="before")
    @classmethod
    def blank_email_to_none(cls, value):
        value = clean_optional_text(value)
        return value.lower() if value else None

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, value):
        return validate_phone_number(value)

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, value):
        return validate_status_value(value)


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    status: Optional[str] = None

    @field_validator("name", mode="before")
    @classmethod
    def validate_optional_name(cls, value):
        if value is None:
            return None

        return validate_name(value)

    @field_validator("email", mode="before")
    @classmethod
    def blank_email_to_none(cls, value):
        return clean_optional_text(value)

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, value):
        return validate_phone_number(value)

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, value):
        if value is None:
            return None

        return validate_status_value(value)


class LeadResponse(BaseModel):
    id: int
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True