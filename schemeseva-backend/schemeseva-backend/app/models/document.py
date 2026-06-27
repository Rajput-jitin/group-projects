"""
Uploaded document model (Aadhaar, income certificate, etc.) and OCR results.
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, Enum, JSON, ForeignKey, func# from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class DocumentTypeEnum(str, enum.Enum):
    aadhaar_card = "aadhaar_card"
    income_certificate = "income_certificate"
    caste_certificate = "caste_certificate"
    student_id = "student_id"
    farmer_card = "farmer_card"
    disability_certificate = "disability_certificate"
    ration_card = "ration_card"
    residence_certificate = "residence_certificate"


class VerificationStatusEnum(str, enum.Enum):
    pending = "pending"
    verified = "verified"
    rejected = "rejected"
    missing_fields = "missing_fields"


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[uuid.UUID] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)

    document_type: Mapped[DocumentTypeEnum] = mapped_column(Enum(DocumentTypeEnum), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    file_format: Mapped[str] = mapped_column(String(10), nullable=False)  # pdf / jpg / png

    ocr_extracted_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    verification_status: Mapped[VerificationStatusEnum] = mapped_column(
        Enum(VerificationStatusEnum), default=VerificationStatusEnum.pending
    )
    missing_fields: Mapped[list | None] = mapped_column(JSON, nullable=True)

    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="documents")
