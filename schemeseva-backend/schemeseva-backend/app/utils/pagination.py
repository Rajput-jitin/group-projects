"""
Small helper for building PaginatedResponse payloads consistently.
"""
import math

from app.schemas.common import PaginatedResponse


def paginate(items: list, total: int, page: int, page_size: int) -> PaginatedResponse:
    total_pages = math.ceil(total / page_size) if page_size else 0
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size, total_pages=total_pages)
