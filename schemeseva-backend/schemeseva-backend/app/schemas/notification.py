"""
Pydantic schemas for Notification.
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.notification import NotificationTypeEnum


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: NotificationTypeEnum
    title: str
    message: str
    is_read: bool
    created_at: datetime
