"""
Stores the result of running the eligibility engine for a user,
either against a single scheme or as a full sweep across all schemes.
"""
import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, Float, Boolean, JSON, ForeignKey, func
# from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class EligibilityCheck(Base):
    __tablename__ = "eligibility_checks"

    id: Mapped[uuid.UUID] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[uuid.UUID] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    scheme_id: Mapped[uuid.UUID | None] = mapped_column(String(36), ForeignKey("schemes.id"), nullable=True)

    is_eligible: Mapped[bool] = mapped_column(Boolean, nullable=False)
    eligibility_score: Mapped[float] = mapped_column(Float, nullable=False)  # 0-100
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)  # 0-100

    missing_documents: Mapped[list | None] = mapped_column(JSON, nullable=True)
    missing_requirements: Mapped[list | None] = mapped_column(JSON, nullable=True)
    matched_criteria: Mapped[list | None] = mapped_column(JSON, nullable=True)

    checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="eligibility_checks")
    scheme = relationship("Scheme", back_populates="eligibility_checks")
