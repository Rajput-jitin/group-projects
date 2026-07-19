"""
Reads schemes from data/schemes.csv and seeds the database.

Duplicate scheme names are automatically skipped so you always end up
with one clean record per unique scheme name.

Run with:
    python scripts/seed.py

Render startup command:
    python scripts/seed.py && uvicorn main:app --host 0.0.0.0 --port $PORT
"""
import sys
import csv
import re
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.database.base import Base
from app.database.session import engine, SessionLocal
from app.models.scheme import Scheme, SchemeTypeEnum, BenefitTypeEnum, SchemeStatusEnum
import app.models  # noqa: F401  (registers all models on Base.metadata)

# Path to CSV — lives in data/ folder next to the backend root
CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "schemes.csv"

# Map CSV Category column → SchemeTypeEnum
CATEGORY_TO_SCHEME_TYPE: dict[str, SchemeTypeEnum] = {
    "farmers":          SchemeTypeEnum.agriculture,
    "agriculture":      SchemeTypeEnum.agriculture,
    "healthcare":       SchemeTypeEnum.health,
    "health":           SchemeTypeEnum.health,
    "housing":          SchemeTypeEnum.housing,
    "msme":             SchemeTypeEnum.employment,
    "entrepreneurship": SchemeTypeEnum.startup,
    "education":        SchemeTypeEnum.scholarship,
    "scholarship":      SchemeTypeEnum.scholarship,
    "employment":       SchemeTypeEnum.employment,
    "skill":            SchemeTypeEnum.skill_development,
    "pension":          SchemeTypeEnum.pension,
    "girl child":       SchemeTypeEnum.women_welfare,
    "women":            SchemeTypeEnum.women_welfare,
    "insurance":        SchemeTypeEnum.insurance,
}

# Map CSV Category column → BenefitTypeEnum
CATEGORY_TO_BENEFIT_TYPE: dict[str, BenefitTypeEnum] = {
    "farmers":          BenefitTypeEnum.direct_cash_transfer,
    "agriculture":      BenefitTypeEnum.direct_cash_transfer,
    "healthcare":       BenefitTypeEnum.insurance,
    "health":           BenefitTypeEnum.insurance,
    "housing":          BenefitTypeEnum.subsidy,
    "msme":             BenefitTypeEnum.loan,
    "entrepreneurship": BenefitTypeEnum.loan,
    "education":        BenefitTypeEnum.scholarship,
    "scholarship":      BenefitTypeEnum.scholarship,
    "employment":       BenefitTypeEnum.training,
    "skill":            BenefitTypeEnum.training,
    "pension":          BenefitTypeEnum.direct_cash_transfer,
    "girl child":       BenefitTypeEnum.subsidy,
    "women":            BenefitTypeEnum.subsidy,
    "insurance":        BenefitTypeEnum.insurance,
}


def clean_scheme_name(raw_name: str) -> str:
    """Remove trailing duplicate markers like 'PM-KISAN (2)' → 'PM-KISAN'."""
    return re.sub(r"\s*\(\d+\)\s*$", "", raw_name).strip()


def parse_eligibility_hints(eligibility_text: str) -> dict:
    """
    Lightly parse the free-text Eligibility column to extract
    structured fields the rule-based eligibility engine can use.
    """
    text = (eligibility_text or "").lower()
    hints: dict = {}

    # Age
    if "18-40" in text:
        hints["min_age"] = 18
        hints["max_age"] = 40
    elif "below 10" in text:
        hints["max_age"] = 10
    elif "18" in text:
        hints["min_age"] = 18

    # Gender
    if "women" in text or "girl" in text:
        hints["eligible_genders"] = ["female"]

    # Occupation
    if "farmer" in text:
        hints["eligible_occupations"] = ["farmer"]
    elif "entrepreneur" in text or "startup" in text:
        hints["eligible_occupations"] = ["startup_founder"]
    elif "student" in text:
        hints["eligible_occupations"] = ["student"]
    elif "youth" in text:
        hints["eligible_occupations"] = ["student", "unemployed"]

    # Caste categories
    if "sc/st" in text:
        hints["eligible_categories"] = ["sc", "st"]

    # Income
    if "bpl" in text or "below poverty" in text:
        hints["income_max"] = 100000
    elif "low income" in text or "low-income" in text:
        hints["income_max"] = 300000

    return hints


def load_schemes_from_csv(path: Path) -> list[dict]:
    """Read the CSV and return a list of dicts ready for Scheme(**data)."""
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found at: {path}")

    seen_names: set[str] = set()
    schemes: list[dict] = []

    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for record in reader:
            raw_name = str(record.get("Scheme Name") or "").strip()
            if not raw_name:
                continue

            # Clean up duplicate numbering e.g. "PM-KISAN (2)" → "PM-KISAN"
            name = clean_scheme_name(raw_name)

            # Skip exact duplicates
            if name.lower() in seen_names:
                continue
            seen_names.add(name.lower())

            category_raw  = str(record.get("Category") or "").strip().lower()
            scheme_type   = CATEGORY_TO_SCHEME_TYPE.get(category_raw, SchemeTypeEnum.employment)
            benefits_type = CATEGORY_TO_BENEFIT_TYPE.get(category_raw, BenefitTypeEnum.direct_cash_transfer)

            eligibility_text = str(record.get("Eligibility") or "").strip()
            hints = parse_eligibility_hints(eligibility_text)

            scheme_data = dict(
                name             = name,
                ministry         = str(record.get("Ministry") or "").strip() or None,
                description      = eligibility_text or None,
                benefits_summary = str(record.get("Benefits") or "").strip() or None,
                official_url     = str(record.get("Official Portal") or "").strip() or None,
                scheme_type      = scheme_type,
                benefits_type    = benefits_type,
                status           = SchemeStatusEnum.open,
                popularity_score = 50,
                **hints,
            )
            schemes.append(scheme_data)

    return schemes


def main():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing_count = db.query(Scheme).count()
        if existing_count > 0:
            print(f"Database already has {existing_count} schemes — skipping seed.")
            return

        print(f"Loading schemes from: {CSV_PATH}")
        schemes = load_schemes_from_csv(CSV_PATH)
        print(f"Found {len(schemes)} unique schemes in CSV.")

        for data in schemes:
            db.add(Scheme(**data))

        db.commit()
        print(f"Successfully seeded {len(schemes)} schemes into the database.")

    except FileNotFoundError as e:
        print(f"ERROR: {e}")
        print("Make sure data/schemes.csv exists in the backend folder.")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
