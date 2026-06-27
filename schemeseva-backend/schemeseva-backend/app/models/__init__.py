"""
Import every model here so that Base.metadata is fully populated
(needed for Alembic autogenerate and for create_all in scripts/seed).
"""
from app.models.user import User
from app.models.scheme import Scheme
from app.models.document import Document
from app.models.eligibility import EligibilityCheck
from app.models.application import Application
from app.models.notification import Notification, SavedScheme, SearchHistory

__all__ = [
    "User",
    "Scheme",
    "Document",
    "EligibilityCheck",
    "Application",
    "Notification",
    "SavedScheme",
    "SearchHistory",
]
