"""
Pydantic schemas for the eligibility checking endpoints.
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.user import GenderEnum, CategoryEnum, EducationEnum, OccupationEnum


class EligibilityCheckRequest(BaseModel):
    """
    Profile used for the check. If the caller is logged in, any omitted
    field falls back to their saved profile.
    """
    age: int | None = None
    gender: GenderEnum | None = None
    state: str | None = None
    is_rural: bool | None = None
    occupation: OccupationEnum | None = None
    annual_income: int | None = None
    category: CategoryEnum | None = None
    education: EducationEnum | None = None
    disability_status: bool | None = None
    scheme_id: uuid.UUID | None = None  # if set, check only this scheme


class SchemeMatchResult(BaseModel):
    scheme_id: uuid.UUID
    scheme_name: str
    is_eligible: bool
    eligibility_score: float
    confidence_score: float
    missing_requirements: list[str]
    matched_criteria: list[str]


class EligibilityCheckResponse(BaseModel):
    checked_schemes_count: int
    eligible_count: int
    results: list[SchemeMatchResult]


class EligibilityCheckRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    scheme_id: uuid.UUID | None
    is_eligible: bool
    eligibility_score: float
    confidence_score: float
    missing_documents: list | None
    missing_requirements: list | None
    matched_criteria: list | None
    checked_at: datetime
