"""
Eligibility engine.

Combines structured criteria fields and smart semantic/rule text parsing
from eligibility_text, details_json, and ministry/description to deliver precise,
transparent scheme eligibility matching.
"""
import re
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
    matched_documents: list[str] = field(default_factory=list)
    missing_documents: list[str] = field(default_factory=list)


def _normalize_str(val: str | None) -> str:
    return val.strip().lower() if val else ""


def _extract_text_age_bounds(text: str) -> tuple[int | None, int | None]:
    """Extract age requirements mentioned in eligibility text like 'between 18 and 60 years' or 'at least 18 years'"""
    min_age, max_age = None, None

    between_match = re.search(r'(?:between|age\s*limit.*?)\s*(\d{1,2})\s*(?:and|to|-)\s*(\d{1,2})\s*years?', text, re.IGNORECASE)
    if between_match:
        min_age = int(between_match.group(1))
        max_age = int(between_match.group(2))
        return min_age, max_age

    min_match = re.search(r'(?:at\s*least|minimum|above|not\s*less\s*than)\s*(\d{1,2})\s*years?', text, re.IGNORECASE)
    if min_match:
        min_age = int(min_match.group(1))

    max_match = re.search(r'(?:maximum|not\s*exceeding|below|up\s*to)\s*(\d{1,2})\s*years?', text, re.IGNORECASE)
    if max_match:
        max_age = int(max_match.group(1))

    return min_age, max_age


def _check_gender_in_text(text: str, user_gender: str) -> tuple[bool | None, str | None]:
    """Check gender restrictions specified in scheme text/title"""
    text_lower = text.lower()
    
    # Female only schemes
    is_female_scheme = bool(
        re.search(r'\b(women|woman|girl|girls|widow|widows|female|mothers|daughters|mahila|kanya|beti)\b', text_lower)
    )
    if is_female_scheme and not re.search(r'\b(men\s*and\s*women|both\s*men\s*and\s*women|boys?\s*and\s*girls?)\b', text_lower):
        if user_gender in ['female', 'woman']:
            return True, "Women / Girl Beneficiary Requirement"
        elif user_gender:
            return False, "Scheme is exclusively for Women / Girl applicants"

    return None, None


def _check_caste_in_text(text: str, user_cat: str) -> tuple[bool | None, str | None]:
    """Check specific caste / social category requirements in text"""
    text_lower = text.lower()
    user_cat_norm = user_cat.lower()

    # Check SC / ST exclusivity
    sc_st_exclusive = bool(re.search(r'\b(sc\s*/\s*st|scheduled\s*castes?(\s*and\s*|\s*/\s*)scheduled\s*tribes?|belonging\s*to\s*(sc|st|scheduled\s*caste|scheduled\s*tribe))\b', text_lower))
    only_st = bool(re.search(r'\b(scheduled\s*tribes?|tribal|belonging\s*to\s*st)\b', text_lower)) and not bool(re.search(r'\b(scheduled\s*castes?|sc)\b', text_lower))
    only_sc = bool(re.search(r'\b(scheduled\s*castes?|belonging\s*to\s*sc)\b', text_lower)) and not bool(re.search(r'\b(scheduled\s*tribes?|st)\b', text_lower))

    if only_st:
        if user_cat_norm == 'st':
            return True, "Scheduled Tribe (ST) Target Beneficiary"
        elif user_cat_norm:
            return False, "Scheme specifically targets Scheduled Tribe (ST) category"
    elif only_sc:
        if user_cat_norm == 'sc':
            return True, "Scheduled Caste (SC) Target Beneficiary"
        elif user_cat_norm:
            return False, "Scheme specifically targets Scheduled Caste (SC) category"
    elif sc_st_exclusive:
        if user_cat_norm in ['sc', 'st']:
            return True, "SC / ST Category Requirement"
        elif user_cat_norm:
            return False, "Scheme requires SC / ST category"

    # Check Minority exclusivity
    minority_exclusive = bool(re.search(r'\b(minority\s*communities?|minority\s*students?|minority\s*welfare)\b', text_lower))
    if minority_exclusive and user_cat_norm in ['sc', 'st', 'obc', 'general']:
        # Note: Minority is a community criterion
        pass

    return None, None


def _check_occupation_in_text(text: str, user_occ: str) -> tuple[bool | None, str | None]:
    """Check farmer, student, artisan, etc. occupations"""
    text_lower = text.lower()
    occ_norm = user_occ.lower()

    is_farmer_scheme = bool(re.search(r'\b(farmer|farmers|kisan|agriculture|cultivator|crop|land\s*holding)\b', text_lower))
    is_student_scheme = bool(re.search(r'\b(scholarship|student|students|matric|school|college|university|education|degree)\b', text_lower))
    is_artisan_scheme = bool(re.search(r'\b(artisan|weavers|craftsmen|handloom|vishwakarma)\b', text_lower))
    is_unemployed_scheme = bool(re.search(r'\b(unemployed|job\s*seeker|employment\s*generation|skill\s*training)\b', text_lower))

    if is_farmer_scheme:
        if occ_norm == 'farmer':
            return True, "Farmer / Agricultural Occupation"
    if is_student_scheme:
        if occ_norm == 'student':
            return True, "Student / Education Enrolled"
    if is_artisan_scheme:
        if occ_norm == 'artisan':
            return True, "Artisan / Craftsman"
    if is_unemployed_scheme:
        if occ_norm == 'unemployed':
            return True, "Unemployed / Skill Seeker"

    return None, None


def evaluate_user_against_scheme(profile: dict, scheme: Scheme) -> CriteriaResult:
    """
    Evaluates applicant profile against scheme metadata, structured criteria,
    and eligibility criteria text with high precision.
    """
    checks: list[tuple[str, bool | None]] = []

    user_age = profile.get("age")
    user_gender = _normalize_str(profile.get("gender"))
    user_state = profile.get("state")
    user_income = profile.get("annual_income")
    user_category = _normalize_str(profile.get("category"))
    user_occupation = _normalize_str(profile.get("occupation"))
    user_education = _normalize_str(profile.get("education"))
    user_disability = profile.get("disability_status")
    user_rural = profile.get("is_rural")

    all_scheme_text = " ".join(filter(None, [
        scheme.name,
        scheme.description,
        scheme.eligibility_text,
        scheme.ministry,
    ]))

    # 1. --- Age Criteria ---
    min_age = scheme.min_age
    max_age = scheme.max_age
    if min_age is None and max_age is None and scheme.eligibility_text:
        text_min, text_max = _extract_text_age_bounds(scheme.eligibility_text)
        min_age, max_age = text_min, text_max

    if min_age is not None or max_age is not None:
        if user_age is None:
            checks.append((f"Age between {min_age or 0}-{max_age or '∞'} yrs", None))
        else:
            ok = True
            if min_age is not None and user_age < min_age:
                ok = False
            if max_age is not None and user_age > max_age:
                ok = False
            checks.append((f"Age requirement ({min_age or 0} to {max_age or '∞'} years)", ok))

    # 2. --- Gender Criteria ---
    if scheme.eligible_genders:
        norm_genders = [g.lower() for g in scheme.eligible_genders]
        if not user_gender:
            checks.append((f"Gender requirement: {', '.join(scheme.eligible_genders)}", None))
        else:
            checks.append((f"Gender eligibility ({', '.join(scheme.eligible_genders)})", user_gender in norm_genders))
    else:
        text_res, label = _check_gender_in_text(all_scheme_text, user_gender)
        if text_res is not None and label:
            checks.append((label, text_res))

    # 3. --- Income Criteria ---
    income_max = scheme.income_max
    income_min = scheme.income_min

    # Try parsing text income limit if not populated in DB
    if income_max is None and scheme.eligibility_text:
        inc_match = re.search(r'(?:income|family\s*income|annual\s*income).*?(?:less\s*than|below|up\s*to|not\s*exceed(?:ing)?)\s*(?:rs\.?|₹)?\s*([\d,]+)', scheme.eligibility_text, re.IGNORECASE)
        if inc_match:
            try:
                income_max = int(inc_match.group(1).replace(',', ''))
            except ValueError:
                pass

    if income_min is not None or income_max is not None:
        if user_income is None:
            checks.append((f"Income within limit (Max ₹{income_max:,})" if income_max else "Annual income criteria", None))
        else:
            ok = True
            if income_min is not None and user_income < income_min:
                ok = False
            if income_max is not None and user_income > income_max:
                ok = False
            checks.append((f"Annual income within limit (Max ₹{income_max:,})" if income_max else "Annual income within limit", ok))

    # 4. --- Category / Caste Criteria ---
    if scheme.eligible_categories:
        norm_cats = [c.lower() for c in scheme.eligible_categories]
        if not user_category:
            checks.append((f"Category requirement: {', '.join(scheme.eligible_categories)}", None))
        else:
            checks.append((f"Category requirement ({', '.join(scheme.eligible_categories)})", user_category in norm_cats))
    else:
        cat_res, cat_label = _check_caste_in_text(all_scheme_text, user_category)
        if cat_res is not None and cat_label:
            checks.append((cat_label, cat_res))

    # 5. --- State Criteria ---
    if scheme.eligible_states and len(scheme.eligible_states) > 0:
        norm_states = [s.lower() for s in scheme.eligible_states]
        if not user_state:
            checks.append((f"Domicile/State requirement ({', '.join(scheme.eligible_states)})", None))
        else:
            checks.append((f"State domicile ({user_state})", user_state.lower() in norm_states))
    else:
        # Check if the scheme is explicitly state-specific by looking at ministry / title
        # (Exclude Central Ministries)
        is_central = bool(
            re.search(r'\b(ministry of|government of india|central|department of\s+(telecommunications|space|atomic))\b', (scheme.ministry or "").lower())
        )
        if not is_central and user_state:
            # Check if another state's name is explicitly in scheme title or ministry
            state_in_name = any(
                st.lower() in all_scheme_text.lower()
                for st in ['Andhra Pradesh','Bihar','Delhi','Gujarat','Haryana','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','West Bengal','Assam','Goa','Himachal Pradesh','Jharkhand','Tripura','Manipur','Meghalaya','Mizoram','Nagaland','Sikkim','Uttarakhand','Chhattisgarh']
                if st.lower() != user_state.lower()
            )
            user_state_matches = user_state.lower() in all_scheme_text.lower()
            if user_state_matches:
                checks.append((f"State specific match ({user_state})", True))
            elif state_in_name:
                checks.append((f"State jurisdiction match", False))

    # 6. --- Occupation Criteria ---
    if scheme.eligible_occupations:
        norm_occs = [o.lower() for o in scheme.eligible_occupations]
        if not user_occupation:
            checks.append((f"Occupation: {', '.join(scheme.eligible_occupations)}", None))
        else:
            checks.append((f"Occupation match ({', '.join(scheme.eligible_occupations)})", user_occupation in norm_occs))
    else:
        occ_res, occ_label = _check_occupation_in_text(all_scheme_text, user_occupation)
        if occ_res is not None and occ_label:
            checks.append((occ_label, occ_res))

    # 7. --- Education Criteria ---
    if scheme.eligible_education_levels:
        norm_edus = [e.lower() for e in scheme.eligible_education_levels]
        if not user_education:
            checks.append((f"Education requirement: {', '.join(scheme.eligible_education_levels)}", None))
        else:
            checks.append((f"Education level requirement", user_education in norm_edus))

    # 8. --- Disability Criteria ---
    if scheme.disability_required is not None:
        if user_disability is None:
            checks.append(("Disability status requirement (PwD)", None))
        else:
            checks.append(("Disability status requirement (PwD)", user_disability == scheme.disability_required))
    elif re.search(r'\b(disability|disabled|divyang|pwd|handicapped|blindness|locomotor)\b', all_scheme_text.lower()):
        if user_disability is True:
            checks.append(("Divyangjan / PwD Benefit Match", True))
        elif user_disability is False:
            checks.append(("Exclusively for Persons with Disabilities (PwD)", False))

    # 9. --- Rural / Urban Area Criteria ---
    if scheme.rural_only:
        if user_rural is None:
            checks.append(("Must be a rural resident", None))
        else:
            checks.append(("Rural residency requirement", bool(user_rural)))
    elif re.search(r'\b(rural\s*areas?|panchayat|gram\s*panchayat|villages?)\b', all_scheme_text.lower()) and not re.search(r'\b(rural\s*and\s*urban|urban\s*and\s*rural)\b', all_scheme_text.lower()):
        if user_rural is True:
            checks.append(("Rural resident alignment", True))

    # 10. --- Document Requirement Verification ---
    user_docs = profile.get("documents") or []
    user_docs_norm = [_normalize_str(d) for d in user_docs]

    matched_docs: list[str] = []
    missing_docs: list[str] = []

    doc_text_source = (scheme.documents_text or "") + " " + str(scheme.details_json.get("documents", "") if scheme.details_json else "")
    doc_text_lower = doc_text_source.lower()

    DOCUMENT_RULES = [
        ("Aadhaar Card", ["aadhaar", "aadhar", "uidai", "aadhaar card", "identity card", "proof of identity", "voter id", "pan card"], "aadhaar"),
        ("Income Certificate", ["income certificate", "income proof", "salary slip", "salary certificate", "form 16", "proof of income"], "income_certificate"),
        ("Caste / Category Certificate", ["caste certificate", "community certificate", "category certificate", "sc certificate", "st certificate", "obc certificate"], "caste_certificate"),
        ("Domicile / Residence Certificate", ["domicile certificate", "residence certificate", "proof of residence", "ration card", "residential certificate", "nativity certificate"], "domicile_certificate"),
        ("Bank Account Passbook", ["bank account", "bank passbook", "cancelled cheque", "account details", "bank details", "ifsc"], "bank_passbook"),
        ("Educational Marksheet / Degree", ["marksheet", "degree", "passing certificate", "matriculation", "10th certificate", "12th certificate", "graduation certificate", "bonafide certificate"], "education_certificate"),
        ("Disability (PwD) Certificate", ["disability certificate", "pwd certificate", "handicapped certificate", "medical board certificate", "udid card"], "disability_certificate"),
        ("Farmer Card / Land Ownership Proof", ["farmer card", "kisan credit card", "kcc", "land records", "7/12", "khasra", "khatauni", "ror", "land ownership"], "land_record"),
        ("Ration Card", ["ration card", "bpl card", "antodaya card", "rashan card"], "ration_card"),
    ]

    for doc_name, keywords, doc_key in DOCUMENT_RULES:
        is_required = any(k in doc_text_lower for k in keywords)
        # Also check if criteria mentions it
        if doc_key == "caste_certificate" and (scheme.eligible_categories or "sc / st" in all_scheme_text.lower()):
            is_required = True
        elif doc_key == "income_certificate" and (scheme.income_max or "income" in all_scheme_text.lower()):
            is_required = True
        elif doc_key == "disability_certificate" and (scheme.disability_required or "disability" in all_scheme_text.lower()):
            is_required = True

        if is_required:
            has_doc = (doc_key in user_docs_norm) or any(k in user_docs_norm for k in keywords)
            if has_doc:
                matched_docs.append(doc_name)
            else:
                missing_docs.append(doc_name)

    matched = [label for label, result in checks if result is True]
    failed = [label for label, result in checks if result is False]
    unknown = [label for label, result in checks if result is None]

    # If documents were provided and some are required, factor into confidence/readiness
    if len(user_docs_norm) > 0 and len(matched_docs) > 0:
        matched.append(f"Document Readiness: {len(matched_docs)} verified required documents held")

    # Fallback if no criteria triggered at all
    if not checks:
        # No verifiable rules found — cannot give 100%
        base = 70.0
        if len(missing_docs) > 0:
            base = 60.0
        return CriteriaResult(
            is_eligible=True,
            eligibility_score=base,
            confidence_score=50.0,
            matched_criteria=matched if matched else ["No specific criteria found — general scheme"],
            missing_requirements=[],
            unknown_criteria=[],
            matched_documents=matched_docs,
            missing_documents=missing_docs,
        )

    total_checks = len(checks)
    known_checks = total_checks - len(unknown)

    # --- Strict scoring engine ---

    if len(failed) > 0:
        # Any failed mandatory criteria = ineligible, hard cap at 35%
        is_eligible = False
        eligibility_score = max(10.0, min(35.0, (len(matched) / max(total_checks, 1)) * 40.0))
    else:
        is_eligible = True

        # Base score from criteria pass rate (out of ALL checks, not just known)
        if total_checks > 0:
            criteria_score = (len(matched) / total_checks) * 100.0
        else:
            criteria_score = 50.0

        # Penalty for unknown / unverifiable criteria (each unknown deducts points)
        unknown_penalty = len(unknown) * (10.0 / max(total_checks, 1)) * 10
        criteria_score = max(40.0, criteria_score - unknown_penalty)

        # Document readiness adjustment
        total_required_docs = len(matched_docs) + len(missing_docs)
        if total_required_docs > 0:
            doc_score = (len(matched_docs) / total_required_docs) * 100.0
            # Blend: 70% criteria + 30% document readiness
            eligibility_score = (criteria_score * 0.70) + (doc_score * 0.30)
        else:
            # No document requirements detected — score purely on criteria, cap at 95%
            eligibility_score = min(criteria_score, 95.0)

        # Only award 100% if EVERY condition is met:
        # - All checks passed (zero failed, zero unknown)
        # - All required documents are held (zero missing)
        all_checks_passed = len(failed) == 0 and len(unknown) == 0 and len(matched) == total_checks
        all_docs_ready = len(missing_docs) == 0
        if all_checks_passed and all_docs_ready and len(matched) > 0:
            eligibility_score = 100.0
        else:
            eligibility_score = min(eligibility_score, 98.0)

    confidence_score = (known_checks / total_checks * 100.0) if total_checks > 0 else 50.0

    return CriteriaResult(
        is_eligible=is_eligible,
        eligibility_score=round(eligibility_score, 1),
        confidence_score=round(confidence_score, 1),
        matched_criteria=matched if matched else ["Partial eligibility criteria satisfied"],
        missing_requirements=failed,
        unknown_criteria=unknown,
        matched_documents=matched_docs,
        missing_documents=missing_docs,
    )
