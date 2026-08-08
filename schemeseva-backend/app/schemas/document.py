"""
Pydantic schemas for Document upload / read.
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.document import DocumentTypeEnum, VerificationStatusEnum


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    document_type: DocumentTypeEnum
    file_url: str
    file_format: str
    ocr_extracted_data: dict | None
    verification_status: VerificationStatusEnum
    missing_fields: list | None
    uploaded_at: datetime
