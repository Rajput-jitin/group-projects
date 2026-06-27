"""
Endpoints for the logged-in user's own profile and dashboard data.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.application import Application
from app.models.document import Document
from app.models.eligibility import EligibilityCheck
from app.models.notification import SavedScheme
from app.models.user import User
from app.schemas.application import ApplicationRead
from app.schemas.document import DocumentRead
from app.schemas.eligibility import EligibilityCheckRead
from app.schemas.scheme import SchemeRead
from app.schemas.user import UserRead, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserRead)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserRead)
def update_my_profile(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/me/documents", response_model=list[DocumentRead])
def get_my_documents(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Document).filter(Document.user_id == current_user.id).order_by(Document.uploaded_at.desc()).all()


@router.get("/me/saved-schemes", response_model=list[SchemeRead])
def get_my_saved_schemes(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    saved = db.query(SavedScheme).filter(SavedScheme.user_id == current_user.id).all()
    return [s.scheme for s in saved]


@router.get("/me/applications", response_model=list[ApplicationRead])
def get_my_applications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(Application)
        .filter(Application.user_id == current_user.id)
        .order_by(Application.applied_at.desc())
        .all()
    )


@router.get("/me/eligibility-history", response_model=list[EligibilityCheckRead])
def get_my_eligibility_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(EligibilityCheck)
        .filter(EligibilityCheck.user_id == current_user.id)
        .order_by(EligibilityCheck.checked_at.desc())
        .all()
    )
