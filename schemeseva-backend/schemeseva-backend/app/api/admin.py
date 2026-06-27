"""
Admin dashboard endpoints. Scheme CRUD lives in api/schemes.py (admin-guarded
routes there); this file covers analytics, user management, and document review.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_admin
from app.database.session import get_db
from app.models.document import Document, VerificationStatusEnum
from app.models.eligibility import EligibilityCheck
from app.models.scheme import Scheme
from app.models.user import User
from app.schemas.document import DocumentRead
from app.schemas.user import UserRead

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])


@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db)):
    total_users = db.query(func.count(User.id)).scalar()
    total_schemes = db.query(func.count(Scheme.id)).scalar()
    total_eligibility_checks = db.query(func.count(EligibilityCheck.id)).scalar()

    most_viewed = (
        db.query(Scheme.id, Scheme.name, Scheme.views_count).order_by(Scheme.views_count.desc()).limit(5).all()
    )

    state_wise = (
        db.query(User.state, func.count(User.id)).filter(User.state.isnot(None)).group_by(User.state).all()
    )

    return {
        "total_users": total_users,
        "total_schemes": total_schemes,
        "total_eligibility_checks": total_eligibility_checks,
        "most_viewed_schemes": [{"id": str(s_id), "name": name, "views": views} for s_id, name, views in most_viewed],
        "state_wise_users": [{"state": state, "count": count} for state, count in state_wise],
        # TODO: "total_searches" once SearchHistory logging is wired up in api/search.py
    }


@router.get("/users", response_model=list[UserRead])
def list_users(page: int = 1, page_size: int = 50, db: Session = Depends(get_db)):
    return db.query(User).offset((page - 1) * page_size).limit(page_size).all()


@router.put("/users/{user_id}/deactivate", response_model=UserRead)
def deactivate_user(user_id: uuid.UUID, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_active = False
    db.commit()
    db.refresh(user)
    return user


@router.get("/documents/pending", response_model=list[DocumentRead])
def pending_documents(db: Session = Depends(get_db)):
    return db.query(Document).filter(Document.verification_status == VerificationStatusEnum.pending).all()


@router.put("/documents/{document_id}/verify", response_model=DocumentRead)
def verify_document(document_id: uuid.UUID, approve: bool, db: Session = Depends(get_db)):
    document = db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    document.verification_status = VerificationStatusEnum.verified if approve else VerificationStatusEnum.rejected
    db.commit()
    db.refresh(document)
    return document
