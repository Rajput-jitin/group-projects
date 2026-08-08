"""
Eligibility engine.

This is a transparent, rule-based scorer that mirrors the criteria fields
on the Scheme model. It's intentionally framework-free (no scikit-learn/
XGBoost yet) so it has zero extra dependencies and is easy to unit test.

Swap-in plan for the real ML model later:
  - Keep `evaluate_user_against_scheme()`'s return shape (CriteriaResult)
    the same so the API/router layer doesn't need to change.
  - Replace the body with a call to a trained classifier (e.g. XGBoost)
    that outputs a probability, and map it to eligibility_score/confidence.
  - The `matched_criteria` / `missing_requirements` lists are still useful
    as explainability output alongside an ML score.
"""
from dataclasses import dataclass, field

from app.models.scheme import Scheme


@dataclass
class CriteriaResult:
    is_eligible: bool
    eligibility_score: float  # 0-100, weighted % of criteria satisfied
    confidence_score: float  # 0-100, based on how much profile data was available
    matched_criteria: list[str] = field(default_factory=list)
    missing_requirements: list[str] = field(default_factory=list)
    unknown_criteria: list[str] = field(default_factory=list)  # profile field was None


def evaluate_user_against_scheme(profile: dict, scheme: Scheme) -> CriteriaResult:
    """
    profile keys expected (any may be None/absent):
      age, gender, state, is_rural, occupation, annual_income,
      category, education, disability_status
    """
    checks: list[tuple[str, bool | None]] = []  # (label, True=pass / False=fail / None=unknown)

    # --- Age ---
    if scheme.min_age is not None or scheme.max_age is not None:
        age = profile.get("age")
        if age is None:
            checks.append((f"Age between {scheme.min_age or 0}-{scheme.max_age or '∞'}", None))
        else:
            ok = True
            if scheme.min_age is not None and age < scheme.min_age:
                ok = False
            if scheme.max_age is not None and age > scheme.max_age:
                ok = False
            checks.append((f"Age between {scheme.min_age or 0}-{scheme.max_age or '∞'}", ok))

    # --- Gender ---
    if scheme.eligible_genders:
        gender = profile.get("gender")
        if gender is None:
            checks.append((f"Gender in {scheme.eligible_genders}", None))
        else:
            checks.append((f"Gender in {scheme.eligible_genders}", gender in scheme.eligible_genders))

    # --- Income ---
    if scheme.income_min is not None or scheme.income_max is not None:
        income = profile.get("annual_income")
        if income is None:
            checks.append(("Annual income within scheme limit", None))
        else:
            ok = True
            if scheme.income_min is not None and income < scheme.income_min:
                ok = False
            if scheme.income_max is not None and income > scheme.income_max:
                ok = False
            checks.append(("Annual income within scheme limit", ok))

    # --- Category ---
    if scheme.eligible_categories:
        category = profile.get("category")
        if category is None:
            checks.append((f"Category in {scheme.eligible_categories}", None))
        else:
            checks.append((f"Category in {scheme.eligible_categories}", category in scheme.eligible_categories))

    # --- State ---
    if scheme.eligible_states:
        state = profile.get("state")
        if state is None:
            checks.append((f"State in {scheme.eligible_states}", None))
        else:
            checks.append((f"State in {scheme.eligible_states}", state in scheme.eligible_states))

    # --- Occupation ---
    if scheme.eligible_occupations:
        occupation = profile.get("occupation")
        if occupation is None:
            checks.append((f"Occupation in {scheme.eligible_occupations}", None))
        else:
            checks.append((f"Occupation in {scheme.eligible_occupations}", occupation in scheme.eligible_occupations))

    # --- Education ---
    if scheme.eligible_education_levels:
        education = profile.get("education")
        if education is None:
            checks.append((f"Education in {scheme.eligible_education_levels}", None))
        else:
            checks.append(
                (f"Education in {scheme.eligible_education_levels}", education in scheme.eligible_education_levels)
            )

    # --- Disability ---
    if scheme.disability_required is not None:
        disability = profile.get("disability_status")
        if disability is None:
            checks.append(("Disability status requirement", None))
        else:
            checks.append(("Disability status requirement", disability == scheme.disability_required))

    # --- Rural only ---
    if scheme.rural_only:
        is_rural = profile.get("is_rural")
        if is_rural is None:
            checks.append(("Must be a rural resident", None))
        else:
            checks.append(("Must be a rural resident", bool(is_rural)))

    if not checks:
        # Scheme has no structured criteria defined yet — treat as open to all.
        return CriteriaResult(is_eligible=True, eligibility_score=100.0, confidence_score=50.0)

    matched = [label for label, result in checks if result is True]
    failed = [label for label, result in checks if result is False]
    unknown = [label for label, result in checks if result is None]

    known_checks = len(checks) - len(unknown)
    eligibility_score = (len(matched) / len(checks)) * 100
    confidence_score = (known_checks / len(checks)) * 100

    # Eligible only if no *known* criterion failed. Unknowns are flagged separately
    # so the user knows what info would sharpen the result.
    is_eligible = len(failed) == 0

    return CriteriaResult(
        is_eligible=is_eligible,
        eligibility_score=round(eligibility_score, 1),
        confidence_score=round(confidence_score, 1),
        matched_criteria=matched,
        missing_requirements=failed,
        unknown_criteria=unknown,
    )
