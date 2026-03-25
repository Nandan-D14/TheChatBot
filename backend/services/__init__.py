"""
Backend services module
Contains external service integrations (Appwrite, etc.)
"""

from .appwrite_service import (
    AppwriteService,
    get_appwrite_service
)

__all__ = [
    "AppwriteService",
    "get_appwrite_service"
]
