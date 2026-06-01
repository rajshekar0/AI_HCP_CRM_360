import re
from app.database import SessionLocal
from app import models


EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

VALID_DESIGNATIONS = {"doctor", "nurse", "pharmacist", "admin", "other"}


def clean_phone(phone: str):
    if phone is None or phone == "":
        return None, ""

    digits = re.sub(r"\D", "", str(phone))

    if not digits:
        return None, ""

    if len(digits) != 10:
        return None, (
            f"Phone number must contain exactly 10 digits. "
            f"You entered {len(digits)} digits."
        )

    return digits, ""


def clean_email(email: str):
    value = (email or "").strip().lower()

    if not value:
        return None, ""

    if not EMAIL_RE.match(value):
        return None, "Invalid email format. Please enter a valid email like name@gmail.com."

    return value, ""


def normalize_designation(value: str):
    designation = (value or "").strip().lower()

    aliases = {
        "dr": "doctor",
        "doctor": "doctor",
        "physician": "doctor",
        "nurse": "nurse",
        "pharmacist": "pharmacist",
        "admin": "admin",
        "administrator": "admin",
        "other": "other",
    }

    return aliases.get(designation, "")


def split_full_name(name: str):
    cleaned = " ".join((name or "").replace(".", " ").split())
    parts = cleaned.split()

    if not parts:
      return "", None

    first_name = parts[0]
    last_name = " ".join(parts[1:]) if len(parts) > 1 else None

    return first_name, last_name


def get_lead_display_name(lead):
    direct_name = (getattr(lead, "name", None) or "").strip()

    if direct_name:
        return direct_name

    first_name = (getattr(lead, "first_name", None) or "").strip()
    last_name = (getattr(lead, "last_name", None) or "").strip()

    return " ".join([part for part in [first_name, last_name] if part]).strip()


def build_lead_payload(lead):
    display_name = get_lead_display_name(lead)

    return {
        "id": lead.id,
        "name": display_name,
        "first_name": getattr(lead, "first_name", None),
        "last_name": getattr(lead, "last_name", None),
        "email": lead.email,
        "phone": lead.phone,
        "designation": getattr(lead, "designation", None),
        "status": lead.status,
    }


def existing_lead_response(existing, error_message: str):
    lead_payload = build_lead_payload(existing)

    return {
        "message": "Lead already exists",
        "saved": False,
        "error": error_message,
        "lead": lead_payload,
        "linked_lead": lead_payload,
        "lead_id": existing.id,
    }


def create_lead_tool(data: dict):
    db = SessionLocal()

    try:
        validation_error = (data.get("validation_error") or "").strip()

        if validation_error:
            return {
                "message": "Lead creation failed",
                "error": validation_error,
                "saved": False,
            }

        name = (data.get("name") or "").strip()
        raw_email = (data.get("email") or "").strip()
        raw_phone = (data.get("phone") or "").strip()
        designation = normalize_designation(data.get("designation"))
        status = (data.get("status") or "new").strip().lower()

        if not name:
            return {
                "message": "Lead creation failed",
                "error": "Name is required. Please include the lead name.",
                "saved": False,
            }

        if not designation:
            return {
                "message": "Lead creation failed",
                "error": "Please specify the HCP designation: doctor, nurse, pharmacist, admin, or other.",
                "saved": False,
            }

        if designation not in VALID_DESIGNATIONS:
            return {
                "message": "Lead creation failed",
                "error": "Invalid designation. Use doctor, nurse, pharmacist, admin, or other.",
                "saved": False,
            }

        email_value, email_error = clean_email(raw_email)

        if email_error:
            return {
                "message": "Lead creation failed",
                "error": email_error,
                "saved": False,
            }

        if not email_value:
            return {
                "message": "Lead creation failed",
                "error": "Email is required. Please include the lead email.",
                "saved": False,
            }

        phone_value, phone_error = clean_phone(raw_phone)

        if phone_error:
            return {
                "message": "Lead creation failed",
                "error": phone_error,
                "saved": False,
            }

        if not phone_value:
            return {
                "message": "Lead creation failed",
                "error": "Phone number is required. Please include the lead phone number.",
                "saved": False,
            }

        existing_email = (
            db.query(models.Lead)
            .filter(models.Lead.email == email_value)
            .first()
        )

        if existing_email:
            return existing_lead_response(
                existing_email,
                "A lead with this email already exists.",
            )

        existing_phone = (
            db.query(models.Lead)
            .filter(models.Lead.phone == phone_value)
            .first()
        )

        if existing_phone:
            return existing_lead_response(
                existing_phone,
                "A lead with this phone number already exists.",
            )

        first_name, last_name = split_full_name(name)

        lead_columns = {column.name for column in models.Lead.__table__.columns}
        lead_kwargs = {
            "email": email_value,
            "phone": phone_value,
            "status": status,
        }

        if "name" in lead_columns:
            lead_kwargs["name"] = name

        if "first_name" in lead_columns:
            lead_kwargs["first_name"] = first_name

        if "last_name" in lead_columns:
            lead_kwargs["last_name"] = last_name

        if "designation" in lead_columns:
            lead_kwargs["designation"] = designation

        lead = models.Lead(**lead_kwargs)

        db.add(lead)
        db.commit()
        db.refresh(lead)

        lead_payload = build_lead_payload(lead)

        return {
            "message": "Lead created successfully",
            "saved": True,
            "lead_id": lead.id,
            "lead": lead_payload,
            "linked_lead": lead_payload,
        }

    except Exception as e:
        db.rollback()

        return {
            "message": "Lead creation failed",
            "error": str(e),
            "saved": False,
        }

    finally:
        db.close()