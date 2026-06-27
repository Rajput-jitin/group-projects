"""
Small shared schemas used across multiple routers.
"""
from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class Message(BaseModel):
    message: str
