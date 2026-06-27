"""
Scheme recommendation service.

Current implementation: rank schemes the user is eligible for by
eligibility_score, then popularity, as a stand-in for a real recommender.

Upgrade path (per the product spec's "Recommendation Engine" section):
  - Collaborative filtering over similar user profiles (state/occupation/
    category/income bracket) and what they applied to or saved.
  - Blend with content-based eligibility_score from eligibility_service.
  - Incorporate SearchHistory as an implicit-interest signal.
"""
from sqlalchemy.orm import Session

from app.models.scheme import Scheme
from app.models.user import User
from app.services.eligibility_service import evaluate_user_against_scheme
from app.schemas.eligibility import SchemeMatchResult


def recommend_schemes_for_user(db: Session, user: User, limit: int = 10) -> list[SchemeMatchResult]:
    profile = {
        "age": user.age,
        "gender": user.gender.value if user.gender else None,
        "state": user.state,
        "is_rural": user.is_rural,
        "occupation": user.occupation.value if user.occupation else None,
        "annual_income": user.annual_income,
        "category": user.category.value if user.category else None,
        "education": user.education.value if user.education else None,
        "disability_status": user.disability_status,
    }

    schemes = db.query(Scheme).all()
    results: list[SchemeMatchResult] = []

    for scheme in schemes:
        result = evaluate_user_against_scheme(profile, scheme)
        results.append(
            SchemeMatchResult(
                scheme_id=scheme.id,
                scheme_name=scheme.name,
                is_eligible=result.is_eligible,
                eligibility_score=result.eligibility_score,
                confidence_score=result.confidence_score,
                missing_requirements=result.missing_requirements,
                matched_criteria=result.matched_criteria,
            )
        )

    results.sort(key=lambda r: (r.is_eligible, r.eligibility_score), reverse=True)
    return results[:limit]
