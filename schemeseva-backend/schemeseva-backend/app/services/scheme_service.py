"""
Builds and runs the filtered scheme query used by GET /api/schemes.
Plain SQLAlchemy + ILIKE for now; swap in Elasticsearch for the
"AI Semantic Search" feature later without changing the router contract.
"""
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session

from app.models.scheme import Scheme
from app.schemas.scheme import SchemeFilterParams


def search_schemes(db: Session, params: SchemeFilterParams) -> tuple[list[Scheme], int]:
    stmt = select(Scheme)

    if params.q:
        like = f"%{params.q}%"
        stmt = stmt.where(or_(Scheme.name.ilike(like), Scheme.description.ilike(like), Scheme.ministry.ilike(like)))

    if params.scheme_type:
        stmt = stmt.where(Scheme.scheme_type == params.scheme_type)

    if params.benefits_type:
        stmt = stmt.where(Scheme.benefits_type == params.benefits_type)

    if params.status:
        stmt = stmt.where(Scheme.status == params.status)

    if params.state:
        # NULL eligible_states means "all states" so it always passes
        stmt = stmt.where(or_(Scheme.eligible_states.is_(None), Scheme.eligible_states.contains([params.state])))

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
