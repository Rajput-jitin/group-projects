"""
Smaller supporting models: Notification, SavedScheme, SearchHistory.
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, String, Boolean, JSON, ForeignKey, UniqueConstraint, func
# from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class NotificationTypeEnum(str, enum.Enum):
    new_scheme = "new_scheme"
    deadline_alert = "deadline_alert"
    status_update = "status_update"
    ministry_announcement = "ministry_announcement"
    security_alert = "security_alert"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[uuid.UUID] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)

    type: Mapped[NotificationTypeEnum] = mapped_column(Enum(NotificationTypeEnum), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(String(1000), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")


class SavedScheme(Base):
    __tablename__ = "saved_schemes"
    __table_args__ = (UniqueConstraint("user_id", "scheme_id", name="uq_user_scheme_saved"),)

    id: Mapped[uuid.UUID] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[uuid.UUID] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    scheme_id: Mapped[uuid.UUID] = mapped_column(String(36), ForeignKey("schemes.id"), nullable=False)
    saved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="saved_schemes")
    scheme = relationship("Scheme", back_populates="saved_by")


class SearchHistory(Base):
    __tablename__ = "search_history"

    id: Mapped[uuid.UUID] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[uuid.UUID] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    query: Mapped[str] = mapped_column(String(300), nullable=False)
    filters: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="search_history")
