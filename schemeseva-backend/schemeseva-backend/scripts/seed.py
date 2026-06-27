"""
Creates tables (dev convenience — use Alembic migrations in production)
and inserts a handful of sample schemes so the API has data to query
right away.

Run with:
    python scripts/seed.py
"""
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.database.base import Base
from app.database.session import engine, SessionLocal
from app.models.scheme import Scheme, SchemeTypeEnum, BenefitTypeEnum, SchemeStatusEnum
import app.models  # noqa: F401  (registers all models on Base.metadata)

SAMPLE_SCHEMES = [
    dict(
        name="PM Kisan Samman Nidhi",
        ministry="Ministry of Agriculture & Farmers Welfare",
        description="Income support of ₹6,000 per year to small and marginal farmer families.",
        benefits_summary="₹6,000/year in three installments via direct bank transfer.",
        scheme_type=SchemeTypeEnum.agriculture,
        benefits_type=BenefitTypeEnum.direct_cash_transfer,
        status=SchemeStatusEnum.open,
        eligible_occupations=["farmer"],
        income_max=300000,
    ),
    dict(
        name="National Scholarship for Higher Education",
        ministry="Ministry of Education",
        description="Merit-cum-means scholarship for college and university students from low-income families.",
        benefits_summary="Tuition fee reimbursement plus annual stipend.",
        scheme_type=SchemeTypeEnum.scholarship,
        benefits_type=BenefitTypeEnum.scholarship,
        status=SchemeStatusEnum.open,
        eligible_education_levels=["college_student", "graduate", "postgraduate"],
        income_max=300000,
        min_age=17,
        max_age=30,
    ),
    dict(
        name="PM Awas Yojana",
        ministry="Ministry of Housing and Urban Affairs",
        description="Affordable housing scheme providing financial assistance to build pucca houses.",
        benefits_summary="Subsidized home loan interest and direct construction assistance.",
        scheme_type=SchemeTypeEnum.housing,
        benefits_type=BenefitTypeEnum.subsidy,
        status=SchemeStatusEnum.open,
        income_max=1800000,
    ),
    dict(
        name="Ayushman Bharat - PMJAY",
        ministry="Ministry of Health and Family Welfare",
        description="Health insurance cover of ₹5 lakh per family per year for secondary and tertiary care.",
        benefits_summary="Cashless hospitalization up to ₹5,00,000 per family per year.",
        scheme_type=SchemeTypeEnum.health,
        benefits_type=BenefitTypeEnum.insurance,
        status=SchemeStatusEnum.open,
        income_max=250000,
        eligible_categories=["general", "obc", "sc", "st", "ews"],
    ),
    dict(
        name="Sukanya Samriddhi Yojana",
        ministry="Ministry of Finance",
        description="Small savings scheme for the girl child with high interest rate and tax benefits.",
        benefits_summary="High interest savings account, maturity at age 21.",
        scheme_type=SchemeTypeEnum.women_welfare,
        benefits_type=BenefitTypeEnum.subsidy,
        status=SchemeStatusEnum.open,
        eligible_genders=["female"],
        max_age=10,
    ),
    dict(
        name="Startup India Seed Fund",
        ministry="Ministry of Commerce and Industry",
        description="Financial assistance for proof of concept, prototype development, and market entry.",
        benefits_summary="Up to ₹20 lakh in seed funding for early-stage startups.",
        scheme_type=SchemeTypeEnum.startup,
        benefits_type=BenefitTypeEnum.direct_cash_transfer,
        status=SchemeStatusEnum.open,
        eligible_occupations=["startup_founder"],
        min_age=18,
    ),
]


def main():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        if db.query(Scheme).count() > 0:
            print("Schemes already exist — skipping seed.")
            return
        for data in SAMPLE_SCHEMES:
            db.add(Scheme(**data))
        db.commit()
        print(f"Seeded {len(SAMPLE_SCHEMES)} sample schemes.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
