"""
Pydantic schemas for the application tracker.
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.application import ApplicationStatusEnum


class ApplicationCreate(BaseModel):
    scheme_id: uuid.UUID
    notes: str | None = None


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatusEnum
    notes: str | None = None


class ApplicationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    scheme_id: uuid.UUID
    status: ApplicationStatusEnum
    notes: str | None
    applied_at: datetime
    updated_at: datetime
