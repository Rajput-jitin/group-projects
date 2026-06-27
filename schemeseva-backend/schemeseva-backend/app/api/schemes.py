"""
Scheme discovery endpoints: search & advanced filters, detail, trending,
category summary, save/unsave, and admin CRUD.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_admin, get_current_user
from app.database.session import get_db
from app.models.notification import SavedScheme
from app.models.scheme import Scheme, SchemeTypeEnum
from app.models.user import User
from app.schemas.common import Message, PaginatedResponse
from app.schemas.scheme import SchemeCreate, SchemeFilterParams, SchemeRead, SchemeUpdate
from app.services.scheme_service import search_schemes
from app.utils.pagination import paginate

router = APIRouter(prefix="/api/schemes", tags=["schemes"])


@router.get("", response_model=PaginatedResponse[SchemeRead])
def list_schemes(filters: SchemeFilterParams = Depends(), db: Session = Depends(get_db)):
    items, total = search_schemes(db, filters)
    return paginate(items, total, filters.page, filters.page_size)


@router.get("/trending", response_model=list[SchemeRead])
def trending_schemes(limit: int = 10, db: Session = Depends(get_db)):
    return db.query(Scheme).order_by(Scheme.popularity_score.desc()).limit(limit).all()


@router.get("/categories")
def scheme_categories(db: Session = Depends(get_db)):
    """Returns scheme counts grouped by scheme_type, for the category cards section."""
    results = []
    for scheme_type in SchemeTypeEnum:
        count = db.query(Scheme).filter(Scheme.scheme_type == scheme_type).count()
        results.append({"scheme_type": scheme_type.value, "total_schemes": count})
    return results


@router.get("/{scheme_id}", response_model=SchemeRead)
def get_scheme(scheme_id: uuid.UUID, db: Session = Depends(get_db)):
    scheme = db.get(Scheme, scheme_id)
    if not scheme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")
    scheme.views_count += 1
    db.commit()
    db.refresh(scheme)
    return scheme


@router.post("/{scheme_id}/save", response_model=Message)
def save_scheme(scheme_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    scheme = db.get(Scheme, scheme_id)
    if not scheme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")

    existing = (
        db.query(SavedScheme)
        .filter(SavedScheme.user_id == current_user.id, SavedScheme.scheme_id == scheme_id)
        .first()
    )
    if existing:
        return Message(message="Scheme already saved")

    db.add(SavedScheme(user_id=current_user.id, scheme_id=scheme_id))
    db.commit()
    return Message(message="Scheme saved")


@router.delete("/{scheme_id}/save", response_model=Message)
def unsave_scheme(scheme_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(SavedScheme).filter(
        SavedScheme.user_id == current_user.id, SavedScheme.scheme_id == scheme_id
    ).delete()
    db.commit()
    return Message(message="Scheme removed from saved list")


# --- Admin CRUD ---


@router.post("", response_model=SchemeRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(get_current_admin)])
def create_scheme(payload: SchemeCreate, db: Session = Depends(get_db)):
    scheme = Scheme(**payload.model_dump())
    db.add(scheme)
    db.commit()
    db.refresh(scheme)
    return scheme


@router.put("/{scheme_id}", response_model=SchemeRead, dependencies=[Depends(get_current_admin)])
def update_scheme(scheme_id: uuid.UUID, payload: SchemeUpdate, db: Session = Depends(get_db)):
    scheme = db.get(Scheme, scheme_id)
    if not scheme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(scheme, field, value)
    db.commit()
    db.refresh(scheme)
    return scheme


@router.delete("/{scheme_id}", response_model=Message, dependencies=[Depends(get_current_admin)])
def delete_scheme(scheme_id: uuid.UUID, db: Session = Depends(get_db)):
    scheme = db.get(Scheme, scheme_id)
    if not scheme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")
    db.delete(scheme)
    db.commit()
    return Message(message="Scheme deleted")
