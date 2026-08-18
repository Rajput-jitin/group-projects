"""
Builds and runs the filtered scheme query used by GET /api/schemes.
Plain SQLAlchemy + ILIKE for now; swap in Elasticsearch for the
"AI Semantic Search" feature later without changing the router contract.
"""
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session

from app.models.scheme import Scheme
from app.schemas.scheme import SchemeFilterParams


STOP_WORDS = {
    "a", "an", "the", "in", "on", "at", "to", "for", "of", "and", "or", "is",
    "are", "was", "were", "be", "with", "by", "from", "about", "related",
    "scheme", "schemes", "yojana", "give", "me", "show", "find", "all", "what",
    "which", "who", "can", "get", "i", "need", "want", "please"
}


def search_schemes(db: Session, params: SchemeFilterParams) -> tuple[list[Scheme], int]:
    stmt = select(Scheme)

    if params.q:
        import re
        raw_q = params.q.strip()
        # Remove punctuation
        clean_text = re.sub(r'[^\w\s]', ' ', raw_q)
        tokens = [w for w in clean_text.split() if w]
        
        # Filter out common conversational stop words
        significant_words = [w for w in tokens if w.lower() not in STOP_WORDS]
        search_words = significant_words if significant_words else tokens

        if search_words:
            word_filters = []
            for word in search_words:
                w_like = f"%{word}%"
                word_filters.append(
                    or_(
                        Scheme.name.ilike(w_like),
                        Scheme.description.ilike(w_like),
                        Scheme.ministry.ilike(w_like),
                        Scheme.benefits_summary.ilike(w_like),
                        Scheme.eligibility_text.ilike(w_like),
                    )
                )
            stmt = stmt.where(or_(*word_filters))

    if params.scheme_type:
        stmt = stmt.where(Scheme.scheme_type == params.scheme_type)

    if params.benefits_type:
        stmt = stmt.where(Scheme.benefits_type == params.benefits_type)

    if params.status:
        stmt = stmt.where(Scheme.status == params.status)

    if params.state:
        state_like = f"%{params.state}%"
        if params.level == "State":
            # Only schemes belonging specifically to this state
            stmt = stmt.where(
                or_(
                    Scheme.name.ilike(state_like),
                    Scheme.ministry.ilike(state_like),
                    Scheme.description.ilike(state_like),
                    Scheme.eligibility_text.ilike(state_like),
                    Scheme.eligible_states.contains([params.state]),
                )
            )
        elif params.level == "Central":
            # Only central / all-India schemes
            stmt = stmt.where(
                or_(
                    Scheme.ministry.ilike("%Ministry of%"),
                    Scheme.ministry.ilike("%Government of India%"),
                    Scheme.ministry.ilike("%Central%"),
                )
            )
        else:
            # All: include this state specific + nationwide central schemes
            stmt = stmt.where(
                or_(
                    Scheme.name.ilike(state_like),
                    Scheme.ministry.ilike(state_like),
                    Scheme.description.ilike(state_like),
                    Scheme.eligibility_text.ilike(state_like),
                    Scheme.eligible_states.contains([params.state]),
                    Scheme.ministry.ilike("%Ministry of%"),
                    Scheme.ministry.ilike("%Government of India%"),
                    Scheme.ministry.ilike("%Central%"),
                )
            )
    elif params.level:
        if params.level == "Central":
            stmt = stmt.where(
                or_(
                    Scheme.ministry.ilike("%Ministry of%"),
                    Scheme.ministry.ilike("%Government of India%"),
                    Scheme.ministry.ilike("%Central%"),
                )
            )
        elif params.level == "State":
            stmt = stmt.where(
                ~Scheme.ministry.ilike("%Ministry of%"),
                ~Scheme.ministry.ilike("%Government of India%"),
                ~Scheme.ministry.ilike("%Central%"),
            )

    if params.dbt:
        stmt = stmt.where(
            or_(
                Scheme.benefits_summary.ilike("%dbt%"),
                Scheme.benefits_summary.ilike("%cash%"),
                Scheme.benefits_summary.ilike("%transfer%"),
                Scheme.benefits_summary.ilike("%financial%"),
                Scheme.benefits_summary.ilike("%₹%"),
                Scheme.benefits_type == "direct_cash_transfer",
            )
        )

    if params.category:
        stmt = stmt.where(
            or_(Scheme.eligible_categories.is_(None), Scheme.eligible_categories.contains([params.category]))
        )

    if params.occupation:
        stmt = stmt.where(
            or_(Scheme.eligible_occupations.is_(None), Scheme.eligible_occupations.contains([params.occupation]))
        )

    if params.education:
        stmt = stmt.where(
            or_(
                Scheme.eligible_education_levels.is_(None),
                Scheme.eligible_education_levels.contains([params.education]),
            )
        )

    if params.income_min is not None:
        stmt = stmt.where(or_(Scheme.income_max.is_(None), Scheme.income_max >= params.income_min))

    if params.income_max is not None:
        stmt = stmt.where(or_(Scheme.income_min.is_(None), Scheme.income_min <= params.income_max))

    if params.disability_status is not None:
        stmt = stmt.where(or_(Scheme.disability_required.is_(None), Scheme.disability_required == params.disability_status))

    # --- count before pagination ---
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))

    # --- sorting ---
    if params.sort_by == "popular":
        stmt = stmt.order_by(Scheme.popularity_score.desc())
    elif params.sort_by == "match":
        # Without a profile there's nothing to score against here; fall back to newest.
        # The /api/eligibility/check endpoint is the real "match score" source.
        stmt = stmt.order_by(Scheme.created_at.desc())
    else:
        stmt = stmt.order_by(Scheme.created_at.desc())

    stmt = stmt.offset((params.page - 1) * params.page_size).limit(params.page_size)

    items = list(db.scalars(stmt).all())
    return items, total or 0
