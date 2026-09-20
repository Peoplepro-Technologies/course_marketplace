"""
auth/roles.py — Role-based access control dependency.

Supported roles:
    admin, super_admin, sub_admin, coursecoordinator, accounts, instructor, learner

Note: Users with the "super_admin" Keycloak role also have "admin" injected
into their realm_roles list, so require_role("admin") passes for them too.

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
        required_role: One of "admin", "super_admin", "sub_admin",
                       "coursecoordinator", "accounts", "instructor", "learner".

    Returns:
        A FastAPI dependency that raises 403 if the role doesn't match.
    """

    async def role_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        roles = getattr(current_user, "_realm_roles", [])
        user_db_role = (current_user.role or "").lower()
        req_role = required_role.lower()

        if (
            req_role in roles
            or user_db_role == req_role
            or user_db_role in ["admin", "super_admin"]
            or "super_admin" in roles
            or "admin" in roles
        ):
            return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Required role: {required_role}",
        )

    return role_checker
