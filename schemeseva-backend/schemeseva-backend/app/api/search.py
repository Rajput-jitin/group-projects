"""
Search endpoint (keyword search now, semantic/NLP search later) and
the personalized "Recommended Schemes For You" endpoint.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.scheme import Scheme
from app.models.user import User
from app.schemas.eligibility import SchemeMatchResult
from app.schemas.scheme import SchemeRead
from app.services.recommendation_service import recommend_schemes_for_user

router = APIRouter(prefix="/api", tags=["search"])


@router.get("/search", response_model=list[SchemeRead])
def keyword_search(q: str, limit: int = 20, db: Session = Depends(get_db)):
    """
    Plain keyword search over name/description/ministry. Intentionally
    open to anonymous users — search shouldn't require login.

    TODO: replace ILIKE matching with Elasticsearch + embeddings for true
    "AI Semantic Search" (e.g. "scholarship for engineering students in UP").
    Also wire up Hindi search via a multilingual embedding model, and log
    queries to SearchHistory for logged-in users to power recommendations.
    """
    like = f"%{q}%"
    return (
        db.query(Scheme)
        .filter(Scheme.name.ilike(like) | Scheme.description.ilike(like) | Scheme.ministry.ilike(like))
        .limit(limit)
        .all()
    )


@router.get("/recommendations", response_model=list[SchemeMatchResult])
def get_recommendations(limit: int = 10, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """'Recommended Schemes For You' — ranked by eligibility score for now."""
    return recommend_schemes_for_user(db, current_user, limit=limit)
