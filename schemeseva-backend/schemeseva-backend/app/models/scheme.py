"""
Government scheme model — holds scheme metadata and the structured
eligibility criteria the rule-based engine evaluates against.
"""
import enum
import uuid
from datetime import datetime, date

from sqlalchemy import String, Integer, Boolean, DateTime, Date, Enum, Text, func, JSON
# from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class SchemeTypeEnum(str, enum.Enum):
    scholarship = "scholarship"
    housing = "housing"
    agriculture = "agriculture"
    employment = "employment"
    health = "health"
    startup = "startup"
    women_welfare = "women_welfare"
    pension = "pension"
    insurance = "insurance"
    skill_development = "skill_development"


class BenefitTypeEnum(str, enum.Enum):
    direct_cash_transfer = "direct_cash_transfer"
    subsidy = "subsidy"
    loan = "loan"
    scholarship = "scholarship"
    insurance = "insurance"
    training = "training"


class SchemeStatusEnum(str, enum.Enum):
    open = "open"
    closing_soon = "closing_soon"
    upcoming = "upcoming"
    closed = "closed"


class Scheme(Base):
    __tablename__ = "schemes"

    id: Mapped[uuid.UUID] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    ministry: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    benefits_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    official_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    scheme_type: Mapped[SchemeTypeEnum] = mapped_column(Enum(SchemeTypeEnum), nullable=False, index=True)
    benefits_type: Mapped[BenefitTypeEnum] = mapped_column(Enum(BenefitTypeEnum), nullable=False)
    status: Mapped[SchemeStatusEnum] = mapped_column(Enum(SchemeStatusEnum), default=SchemeStatusEnum.open, index=True)

    # --- Eligibility criteria (used by the rule-based eligibility engine) ---
    min_age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    eligible_genders: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)  # null = any
    income_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    income_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    eligible_categories: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    eligible_states: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)  # null = all-India
    eligible_occupations: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    eligible_education_levels: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    disability_required: Mapped[bool | None] = mapped_column(Boolean, nullable=True)  # None = not required
    rural_only: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    application_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    application_deadline: Mapped[date | None] = mapped_column(Date, nullable=True)

    views_count: Mapped[int] = mapped_column(Integer, default=0)
    applications_count: Mapped[int] = mapped_column(Integer, default=0)
    popularity_score: Mapped[float] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    saved_by = relationship("SavedScheme", back_populates="scheme", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="scheme", cascade="all, delete-orphan")
    eligibility_checks = relationship("EligibilityCheck", back_populates="scheme")
