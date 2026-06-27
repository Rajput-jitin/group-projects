"""
Pydantic schemas for Scheme: create/update (admin), read, and the
filter query parameters used by the search & advanced-filter endpoint.
"""
import uuid
from datetime import datetime, date

from pydantic import BaseModel, ConfigDict

from app.models.scheme import SchemeTypeEnum, BenefitTypeEnum, SchemeStatusEnum


class SchemeBase(BaseModel):
    name: str
    ministry: str | None = None
    description: str | None = None
    benefits_summary: str | None = None
    official_url: str | None = None
    scheme_type: SchemeTypeEnum
    benefits_type: BenefitTypeEnum
    status: SchemeStatusEnum = SchemeStatusEnum.open

    min_age: int | None = None
    max_age: int | None = None
    eligible_genders: list[str] | None = None
    income_min: int | None = None
    income_max: int | None = None
    eligible_categories: list[str] | None = None
    eligible_states: list[str] | None = None
    eligible_occupations: list[str] | None = None
    eligible_education_levels: list[str] | None = None
    disability_required: bool | None = None
    rural_only: bool | None = None

    application_start_date: date | None = None
    application_deadline: date | None = None


class SchemeCreate(SchemeBase):
    pass


class SchemeUpdate(BaseModel):
    name: str | None = None
    ministry: str | None = None
    description: str | None = None
    benefits_summary: str | None = None
    official_url: str | None = None
    scheme_type: SchemeTypeEnum | None = None
    benefits_type: BenefitTypeEnum | None = None
    status: SchemeStatusEnum | None = None
    min_age: int | None = None
    max_age: int | None = None
    eligible_genders: list[str] | None = None
    income_min: int | None = None
    income_max: int | None = None
    eligible_categories: list[str] | None = None
    eligible_states: list[str] | None = None
    eligible_occupations: list[str] | None = None
    eligible_education_levels: list[str] | None = None
    disability_required: bool | None = None
    rural_only: bool | None = None
    application_start_date: date | None = None
    application_deadline: date | None = None


class SchemeRead(SchemeBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    views_count: int
    applications_count: int
    popularity_score: float
    created_at: datetime
    updated_at: datetime


class SchemeFilterParams(BaseModel):
    """Query params accepted by GET /api/schemes (all optional)."""
    q: str | None = None
    state: str | None = None
    district: str | None = None
    is_rural: bool | None = None
    age: int | None = None
    gender: str | None = None
    category: str | None = None
    disability_status: bool | None = None
    education: str | None = None
    occupation: str | None = None
    income_min: int | None = None
    income_max: int | None = None
    scheme_type: SchemeTypeEnum | None = None
    benefits_type: BenefitTypeEnum | None = None
    status: SchemeStatusEnum | None = None
    sort_by: str = "newest"  # newest | match | popular
    page: int = 1
    page_size: int = 20
