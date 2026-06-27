"""
Tracks a user's application to a scheme through its lifecycle.
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, Enum, Text, ForeignKey, func
# from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class ApplicationStatusEnum(str, enum.Enum):
    applied = "applied"
    under_review = "under_review"
    approved = "approved"
    rejected = "rejected"


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[uuid.UUID] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[uuid.UUID] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    scheme_id: Mapped[uuid.UUID] = mapped_column(String(36), ForeignKey("schemes.id"), nullable=False)

    status: Mapped[ApplicationStatusEnum] = mapped_column(Enum(ApplicationStatusEnum), default=ApplicationStatusEnum.applied)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="applications")
    scheme = relationship("Scheme", back_populates="applications")
