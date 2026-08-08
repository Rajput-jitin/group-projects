"""
Eligibility checking endpoints — the core "AI Eligibility Prediction" feature.
Currently backed by the rule-based engine in services/eligibility_service.py.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_optional_user
from app.database.session import get_db
from app.models.eligibility import EligibilityCheck
from app.models.scheme import Scheme
from app.models.user import User
from app.schemas.eligibility import (
    EligibilityCheckRequest,
    EligibilityCheckResponse,
    EligibilityCheckRead,
    SchemeMatchResult,
)
from app.services.eligibility_service import evaluate_user_against_scheme

router = APIRouter(prefix="/api/eligibility", tags=["eligibility"])


def _build_profile(payload: EligibilityCheckRequest, user: User | None) -> dict:
    """Request fields take precedence; fall back to the logged-in user's saved profile if available."""
    def pick(value, attr):
        if value is not None:
            return value.value if hasattr(value, "value") else value
        if user and hasattr(user, attr):
            saved = getattr(user, attr)
            return saved.value if hasattr(saved, "value") else saved
        return None

    return {
        "age": payload.age if payload.age is not None else (user.age if user else None),
        "gender": pick(payload.gender, "gender"),
        "state": payload.state if payload.state is not None else (user.state if user else None),
        "is_rural": payload.is_rural if payload.is_rural is not None else (user.is_rural if user else None),
        "occupation": pick(payload.occupation, "occupation"),
        "annual_income": payload.annual_income if payload.annual_income is not None else (user.annual_income if user else None),
        "category": pick(payload.category, "category"),
        "education": pick(payload.education, "education"),
        "disability_status": payload.disability_status if payload.disability_status is not None else (user.disability_status if user else False),
    }


@router.post("/check", response_model=EligibilityCheckResponse)
def check_eligibility(
    payload: EligibilityCheckRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    profile = _build_profile(payload, current_user)

    if payload.scheme_id:
        scheme = db.get(Scheme, payload.scheme_id)
        if scheme is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")
        schemes = [scheme]
    else:
        schemes = db.query(Scheme).all()

    results: list[SchemeMatchResult] = []
    for scheme in schemes:
        result = evaluate_user_against_scheme(profile, scheme)
        match = SchemeMatchResult(
            scheme_id=scheme.id,
            scheme_name=scheme.name,
            is_eligible=result.is_eligible,
            eligibility_score=result.eligibility_score,
            confidence_score=result.confidence_score,
            missing_requirements=result.missing_requirements,
            matched_criteria=result.matched_criteria,
        )
        results.append(match)

        if current_user:
            db.add(
                EligibilityCheck(
                    user_id=current_user.id,
                    scheme_id=scheme.id,
                    is_eligible=result.is_eligible,
                    eligibility_score=result.eligibility_score,
                    confidence_score=result.confidence_score,
                    missing_documents=None,  # TODO: cross-reference with verified Documents
                    missing_requirements=result.missing_requirements,
                    matched_criteria=result.matched_criteria,
                )
            )

    if current_user:
        db.commit()

    results.sort(key=lambda r: (r.is_eligible, r.eligibility_score), reverse=True)
    return EligibilityCheckResponse(
        checked_schemes_count=len(results),
        eligible_count=sum(1 for r in results if r.is_eligible),
        results=results,
    )


@router.get("/history", response_model=list[EligibilityCheckRead])
def eligibility_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(EligibilityCheck)
        .filter(EligibilityCheck.user_id == current_user.id)
        .order_by(EligibilityCheck.checked_at.desc())
        .all()
    )


@router.get("/{check_id}", response_model=EligibilityCheckRead)
def get_eligibility_check(
    check_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check = db.get(EligibilityCheck, check_id)
    if not check or check.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Eligibility check not found")
    return check
