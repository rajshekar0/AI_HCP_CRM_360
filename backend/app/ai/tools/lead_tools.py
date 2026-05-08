import re
from app.database import SessionLocal
from app import models


EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


def clean_phone(phone: str):
    """
    Phone validation rule:
    - Empty phone is allowed.
    - If phone is provided, it must contain exactly 10 digits.
    - Never trim/crop 11 or 12 digits into 10 digits.
    """
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
    """
    Email validation rule:
    - Empty email is allowed.
    - If email is provided, it must be valid.
    - Email is always stored in lowercase.
    """
    value = (email or "").strip().lower()

    if not value:
        return None, ""

    if not EMAIL_RE.match(value):
        return None, "Invalid email format. Please enter a valid email like name@gmail.com."

    return value, ""


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
        status = (data.get("status") or "new").strip().lower()

        if not name:
            return {
                "message": "Lead creation failed",
                "error": "Name is required. Please include the lead name.",
                "saved": False,
            }

        email_value, email_error = clean_email(raw_email)

        if email_error:
            return {
                "message": "Lead creation failed",
                "error": email_error,
                "saved": False,
            }

        phone_value, phone_error = clean_phone(raw_phone)

        if phone_error:
            return {
                "message": "Lead creation failed",
                "error": phone_error,
                "saved": False,
            }

        if email_value:
            existing = db.query(models.Lead).filter(models.Lead.email == email_value).first()

            if existing:
                return {
                    "message": "Lead already exists",
                    "saved": False,
                    "error": "A lead with this email already exists.",
                    "lead": {
                        "id": existing.id,
                        "name": existing.name,
                        "email": existing.email,
                        "phone": existing.phone,
                        "status": existing.status,
                    },
                }

        lead = models.Lead(
            name=name,
            email=email_value,
            phone=phone_value,
            status=status,
        )

        db.add(lead)
        db.commit()
        db.refresh(lead)

        return {
            "message": "Lead created successfully",
            "saved": True,
            "lead_id": lead.id,
            "lead": {
                "id": lead.id,
                "name": lead.name,
                "email": lead.email,
                "phone": lead.phone,
                "status": lead.status,
            },
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