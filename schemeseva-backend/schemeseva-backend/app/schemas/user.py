"""
Pydantic schemas for User: registration, profile read/update, public view.
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, ConfigDict

from app.models.user import GenderEnum, CategoryEnum, EducationEnum, OccupationEnum, LanguageEnum


class UserBase(BaseModel):
    full_name: str
    age: int | None = None
    gender: GenderEnum | None = None
    state: str | None = None
    district: str | None = None
    is_rural: bool | None = None
    occupation: OccupationEnum | None = None
    annual_income: int | None = None
    category: CategoryEnum | None = None
    education: EducationEnum | None = None
    disability_status: bool = False
    marital_status: str | None = None
    language_preference: LanguageEnum = LanguageEnum.en


class UserCreate(UserBase):
    email: EmailStr
    mobile: str | None = None
    password: str


class UserUpdate(BaseModel):
    full_name: str | None = None
    age: int | None = None
    gender: GenderEnum | None = None
    state: str | None = None
    district: str | None = None
    is_rural: bool | None = None
    occupation: OccupationEnum | None = None
    annual_income: int | None = None
    category: CategoryEnum | None = None
    education: EducationEnum | None = None
    disability_status: bool | None = None
    marital_status: str | None = None
    language_preference: LanguageEnum | None = None


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    mobile: str | None
    is_admin: bool
    email_verified: bool
    mobile_verified: bool
    created_at: datetime
