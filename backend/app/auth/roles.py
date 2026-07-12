"""
auth/roles.py — Role-based access control dependency.

Usage:
    @router.get("/admin-only", dependencies=[Depends(require_role("admin"))])
    def admin_endpoint():
        ...
"""

from fastapi import Depends, HTTPException, status
from app.auth.keycloak import get_current_user
from app.models.user import User


def require_role(required_role: str):
    """
    Dependency factory that returns a dependency function.
    The inner function checks that the authenticated user has the
    required Keycloak realm role.

    Args:
        required_role: One of "admin", "instructor", "learner".

    Returns:
        A FastAPI dependency that raises 403 if the role doesn't match.
    """

    async def role_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        # _realm_roles is attached by get_current_user
        roles = getattr(current_user, "_realm_roles", [])
        if required_role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {required_role}",
            )
        return current_user

    return role_checker
