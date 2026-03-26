"""
Authentication dependency compatibility layer.

App-level access control is enforced by middleware via x-app-access-key.
Routes still depend on get_current_user for data-scoping compatibility.
"""

from typing import Dict


async def get_current_user() -> Dict[str, str]:
    """Return a stable user context for existing route contracts."""
    return {
        "user_id": "shared-app-user",
        "email": "",
    }
