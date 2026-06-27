"""
User model — citizen profile used for eligibility matching.
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Boolean, DateTime, Enum, func, JSON
# from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class GenderEnum(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"


class CategoryEnum(str, enum.Enum):
    general = "general"
    obc = "obc"
    sc = "sc"
    st = "st"
    ews = "ews"


class EducationEnum(str, enum.Enum):
    school = "school_student"
    college = "college_student"
    diploma = "diploma"
    graduate = "graduate"
    postgraduate = "postgraduate"
    research_scholar = "research_scholar"
    none = "none"


class OccupationEnum(str, enum.Enum):
    student = "student"
    farmer = "farmer"
    business_owner = "business_owner"
    startup_founder = "startup_founder"
    government_employee = "government_employee"
    private_employee = "private_employee"
    unemployed = "unemployed"
    senior_citizen = "senior_citizen"


class LanguageEnum(str, enum.Enum):
    en = "en"
    hi = "hi"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    mobile: Mapped[str | None] = mapped_column(String(15), unique=True, index=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gender: Mapped[GenderEnum | None] = mapped_column(Enum(GenderEnum), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    district: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_rural: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    occupation: Mapped[OccupationEnum | None] = mapped_column(Enum(OccupationEnum), nullable=True)
    annual_income: Mapped[int | None] = mapped_column(Integer, nullable=True)  # in INR
    category: Mapped[CategoryEnum | None] = mapped_column(Enum(CategoryEnum), nullable=True)
    education: Mapped[EducationEnum | None] = mapped_column(Enum(EducationEnum), nullable=True)
    disability_status: Mapped[bool] = mapped_column(Boolean, default=False)
    marital_status: Mapped[str | None] = mapped_column(String(20), nullable=True)

    language_preference: Mapped[LanguageEnum] = mapped_column(Enum(LanguageEnum), default=LanguageEnum.en)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    mobile_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    documents = relationship("Document", back_populates="owner", cascade="all, delete-orphan")
    saved_schemes = relationship("SavedScheme", back_populates="user", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="user", cascade="all, delete-orphan")
    eligibility_checks = relationship("EligibilityCheck", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    search_history = relationship("SearchHistory", back_populates="user", cascade="all, delete-orphan")
