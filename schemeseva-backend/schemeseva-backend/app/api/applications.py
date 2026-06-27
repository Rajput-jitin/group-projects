"""
Application tracker endpoints.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_admin, get_current_user
from app.database.session import get_db
from app.models.application import Application
from app.models.scheme import Scheme
from app.models.user import User
from app.schemas.application import ApplicationCreate, ApplicationRead, ApplicationStatusUpdate

router = APIRouter(prefix="/api/applications", tags=["applications"])


@router.post("", response_model=ApplicationRead, status_code=status.HTTP_201_CREATED)
def apply_to_scheme(
    payload: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    scheme = db.get(Scheme, payload.scheme_id)
    if not scheme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")

    application = Application(user_id=current_user.id, scheme_id=payload.scheme_id, notes=payload.notes)
    db.add(application)
    scheme.applications_count += 1
    db.commit()
    db.refresh(application)
    return application


@router.get("", response_model=list[ApplicationRead])
def list_my_applications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Application).filter(Application.user_id == current_user.id).all()


@router.get("/{application_id}", response_model=ApplicationRead)
def get_application(application_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    application = db.get(Application, application_id)
    if not application or application.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return application


@router.put("/{application_id}/status", response_model=ApplicationRead, dependencies=[Depends(get_current_admin)])
def update_application_status(application_id: uuid.UUID, payload: ApplicationStatusUpdate, db: Session = Depends(get_db)):
    application = db.get(Application, application_id)
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    application.status = payload.status
    if payload.notes is not None:
        application.notes = payload.notes
    db.commit()
    db.refresh(application)
    return application
