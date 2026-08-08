"""
Document upload + OCR endpoints.
Files are saved to local disk under UPLOAD_DIR for now; swap for S3/Cloudinary
by changing only `_save_upload_file()`.
"""
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.database.session import get_db
from app.models.document import Document, DocumentTypeEnum, VerificationStatusEnum
from app.models.user import User
from app.schemas.document import DocumentRead
from app.services.ocr_service import extract_document_data

router = APIRouter(prefix="/api/documents", tags=["documents"])

ALLOWED_FORMATS = {"pdf", "jpg", "jpeg", "png"}


def _save_upload_file(file: UploadFile, user_id: uuid.UUID) -> tuple[str, str]:
    file_ext = (file.filename.rsplit(".", 1)[-1] if "." in file.filename else "").lower()
    if file_ext not in ALLOWED_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{file_ext}'. Allowed: {sorted(ALLOWED_FORMATS)}",
        )

    upload_dir = Path(settings.UPLOAD_DIR) / str(user_id)
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_name = f"{uuid.uuid4()}.{file_ext}"
    file_path = upload_dir / file_name
    with open(file_path, "wb") as f:
        f.write(file.file.read())

    return str(file_path), file_ext


@router.post("/upload", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
def upload_document(
    document_type: DocumentTypeEnum,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    file_path, file_ext = _save_upload_file(file, current_user.id)

    extracted_data, missing_fields = extract_document_data(document_type, file_path)
    verification_status = VerificationStatusEnum.missing_fields if missing_fields else VerificationStatusEnum.pending

    document = Document(
        user_id=current_user.id,
        document_type=document_type,
        file_url=file_path,
        file_format=file_ext,
        ocr_extracted_data=extracted_data,
        verification_status=verification_status,
        missing_fields=missing_fields,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


@router.get("", response_model=list[DocumentRead])
def list_documents(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Document).filter(Document.user_id == current_user.id).all()


@router.get("/{document_id}", response_model=DocumentRead)
def get_document(document_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    document = db.get(Document, document_id)
    if not document or document.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document


@router.post("/{document_id}/ocr", response_model=DocumentRead)
def reprocess_ocr(document_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    document = db.get(Document, document_id)
    if not document or document.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    extracted_data, missing_fields = extract_document_data(document.document_type, document.file_url)
    document.ocr_extracted_data = extracted_data
    document.missing_fields = missing_fields
    document.verification_status = (
        VerificationStatusEnum.missing_fields if missing_fields else VerificationStatusEnum.pending
    )
    db.commit()
    db.refresh(document)
    return document


@router.delete("/{document_id}")
def delete_document(document_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    document = db.get(Document, document_id)
    if not document or document.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    db.delete(document)
    db.commit()
    return {"message": "Document deleted"}
