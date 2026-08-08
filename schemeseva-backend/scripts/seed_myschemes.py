"""
Reads all schemes from data/myscheme_complete.json and seeds the database with rich details.

Run with:
    python scripts/seed_myschemes.py
"""
import sys
import json
import re
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.database.base import Base
from app.database.session import engine, SessionLocal
from app.models.scheme import Scheme, SchemeTypeEnum, BenefitTypeEnum, SchemeStatusEnum
from app import models  # noqa: F401  (registers all models on Base.metadata)

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "myscheme_complete.json"


def extract_text_blocks(blocks) -> str:
    """Helper to cleanly convert nested dict/list markdown structures into clean text lines."""
    if isinstance(blocks, str):
        return blocks.strip()
    if not isinstance(blocks, list):
        return ""
    out = []
    for b in blocks:
        if isinstance(b, str):
            if b.strip():
                out.append(b.strip())
        elif isinstance(b, dict):
            if "text" in b and str(b["text"]).strip():
                out.append(str(b["text"]).strip())
            elif "children" in b:
                res = extract_text_blocks(b["children"])
                if res:
                    out.append(res)
    return "\n".join(out)


def map_scheme_type(name: str, desc: str, cat: str, tags: list[str]) -> SchemeTypeEnum:
    text = (name + " " + cat + " " + " ".join(tags) + " " + desc).lower()
    if any(k in text for k in ["farmer", "agricultur", "kisan", "crop", "irrigation", "soil", "krishi", "makhana"]):
        return SchemeTypeEnum.agriculture
    if any(k in text for k in ["scholarship", "student", "education", "tuition", "school", "college", "shiksha", "chatra", "chattar"]):
        return SchemeTypeEnum.scholarship
    if any(k in text for k in ["women", "girl", "mother", "matru", "female", "nari", "mahila", "widow", "kanya"]):
        return SchemeTypeEnum.women_welfare
    if any(k in text for k in ["health", "hospital", "medical", "ayushman", "arogya", "treatment", "swasthya", "disease"]):
        return SchemeTypeEnum.health
    if any(k in text for k in ["pension", "old age", "senior", "vaya", "vridha"]):
        return SchemeTypeEnum.pension
    if any(k in text for k in ["house", "housing", "awas", "shelter", "residence"]):
        return SchemeTypeEnum.housing
    if any(k in text for k in ["startup", "entrepreneur", "business", "mudra", "stand-up", "msme", "credit", "loan", "venture"]):
        return SchemeTypeEnum.startup
    if any(k in text for k in ["skill", "training", "kaushal", "apprenticeship", "vikas"]):
        return SchemeTypeEnum.skill_development
    if any(k in text for k in ["insurance", "bima", "accidental cover", "life cover"]):
        return SchemeTypeEnum.insurance
    return SchemeTypeEnum.employment


def map_benefit_type(tags: list[str], text: str) -> BenefitTypeEnum:
    t_str = (" ".join(tags) + " " + text).lower()
    if "loan" in t_str or "credit" in t_str:
        return BenefitTypeEnum.loan
    if "scholarship" in t_str or "stipend" in t_str:
        return BenefitTypeEnum.scholarship
    if "insurance" in t_str or "cover" in t_str:
        return BenefitTypeEnum.insurance
    if "subsidy" in t_str or "grant" in t_str:
        return BenefitTypeEnum.subsidy
    if "training" in t_str or "skill" in t_str:
        return BenefitTypeEnum.training
    return BenefitTypeEnum.direct_cash_transfer


def parse_eligibility_hints(eligibility_text: str) -> dict:
    text = (eligibility_text or "").lower()
    hints: dict = {}

    # Age
    age_match = re.search(r"(\d{1,2})\s*[-to–]+\s*(\d{1,2})\s*years?", text)
    if age_match:
        try:
            hints["min_age"] = int(age_match.group(1))
            hints["max_age"] = int(age_match.group(2))
        except ValueError:
            pass

    if "women" in text or "female" in text or "girl" in text:
        hints["eligible_genders"] = ["female"]

    if "farmer" in text:
        hints["eligible_occupations"] = ["farmer"]
    elif "student" in text:
        hints["eligible_occupations"] = ["student"]

    if "sc/st" in text or "scheduled caste" in text:
        hints["eligible_categories"] = ["sc", "st"]

    if "bpl" in text or "below poverty" in text:
        hints["income_max"] = 120000

    return hints


def main():
    if not DATA_PATH.exists():
        print(f"ERROR: File not found at {DATA_PATH}")
        sys.exit(1)

    print("Recreating database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    print(f"Loading schemes from {DATA_PATH}...")
    with open(DATA_PATH, encoding="utf-8") as f:
        data = json.load(f)

    db = SessionLocal()
    count = 0
    seen_names = set()

    try:
        schemes_to_insert = []
        for idx, item in enumerate(data):
            det = item.get("details")
            if not isinstance(det, dict):
                continue
            en = det.get("en")
            if not isinstance(en, dict):
                continue

            bd = en.get("basicDetails", {})
            sc = en.get("schemeContent", {})
            ec = en.get("eligibilityCriteria", {})
            ap = en.get("applicationProcess", [])
            doc_data = item.get("documents", {})
            doc_en = (
                doc_data.get("en", {})
                if isinstance(doc_data, dict)
                else (doc_data[0].get("en", {}) if isinstance(doc_data, list) and len(doc_data) > 0 else {})
            )

            name = str(bd.get("schemeName") or "").strip()
            if not name or name.lower() in seen_names:
                continue
            seen_names.add(name.lower())

            ministry_val = bd.get("nodalMinistryName") or bd.get("nodalDepartmentName") or bd.get("implementingAgency")
            if isinstance(ministry_val, dict):
                ministry = str(ministry_val.get("label") or "").strip()
            else:
                ministry = str(ministry_val or "").strip()
            if not ministry:
                ministry = "Government of India"

            tags = [str(t) for t in (bd.get("tags") or []) if t]
            scheme_cat = str(bd.get("schemeCategory") or bd.get("schemeType") or "")
            brief_desc = str(sc.get("briefDescription") or "").strip()
            detailed_desc = str(sc.get("detailedDescription_md") or sc.get("detailedDescription") or brief_desc).strip()
            benefits_summary = str(sc.get("benefits_md") or sc.get("benefits") or brief_desc).strip()
            if len(benefits_summary) > 400:
                benefits_summary_clean = brief_desc if brief_desc else benefits_summary[:397] + "..."
            else:
                benefits_summary_clean = benefits_summary

            eligibility_text = str(ec.get("eligibilityDescription_md") or extract_text_blocks(ec.get("eligibilityCriteria"))).strip()
            documents_text = extract_text_blocks(doc_en.get("documents_required") or doc_en.get("documents"))

            # Application Process & URL
            official_url = str(bd.get("schemeOpenUrl") or "").strip() or None
            proc_steps = []
            if isinstance(ap, list):
                for p in ap:
                    if isinstance(p, dict):
                        if not official_url and p.get("url"):
                            url_candidate = str(p.get("url")).strip()
                            if url_candidate and not url_candidate.startswith("http"):
                                url_candidate = "https://" + url_candidate
                            official_url = url_candidate
                        proc = p.get("process")
                        step_text = extract_text_blocks(proc)
                        if step_text:
                            proc_steps.append(step_text)

            process_text = "\n\n".join(proc_steps)

            scheme_type = map_scheme_type(name, detailed_desc, scheme_cat, tags)
            benefit_type = map_benefit_type(tags, benefits_summary_clean)
            hints = parse_eligibility_hints(eligibility_text)

            # Details JSON payload
            details_payload = {
                "slug": item.get("slug"),
                "scheme_id": item.get("scheme_id"),
                "tags": tags,
                "schemeCategory": scheme_cat,
                "implementingAgency": bd.get("implementingAgency"),
                "level": bd.get("level"),
                "targetBeneficiaries": bd.get("targetBeneficiaries"),
                "detailedDescription": detailed_desc,
                "benefits": benefits_summary,
                "eligibility": eligibility_text,
                "documents": documents_text,
                "process": process_text,
            }

            s_obj = Scheme(
                name=name[:200],
                ministry=ministry[:200],
                description=detailed_desc,
                benefits_summary=benefits_summary_clean,
                official_url=official_url[:500] if official_url else "https://myscheme.gov.in",
                scheme_type=scheme_type,
                benefits_type=benefit_type,
                status=SchemeStatusEnum.open,
                popularity_score=max(60, 99 - (idx % 35)),
                details_json=details_payload,
                documents_text=documents_text,
                process_text=process_text,
                eligibility_text=eligibility_text,
                **hints,
            )
            schemes_to_insert.append(s_obj)

            if len(schemes_to_insert) >= 500:
                db.bulk_save_objects(schemes_to_insert)
                db.commit()
                count += len(schemes_to_insert)
                print(f"Seeded {count} schemes...")
                schemes_to_insert = []

        if schemes_to_insert:
            db.bulk_save_objects(schemes_to_insert)
            db.commit()
            count += len(schemes_to_insert)

        print(f"[SUCCESS] Successfully seeded ALL {count} schemes into SQLite database!")

    except Exception as e:
        db.rollback()
        print(f"ERROR during seeding: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    main()
