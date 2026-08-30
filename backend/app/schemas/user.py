"""
schemas/user.py — Pydantic schemas for User endpoints.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from uuid import UUID


class UserBase(BaseModel):
    """Fields shared across create/read operations."""
    name: str = ""
    email: EmailStr = ""
    role: str = "learner"
    is_active: bool = True
    profile_pic: Optional[str] = None
    bio: Optional[str] = None


class UserCreate(UserBase):
    """Used internally when auto-creating a user from Keycloak data."""
    keycloak_sub: str


class UserRead(UserBase):
    """Returned to clients — includes id and timestamps."""
    id: UUID
    keycloak_sub: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """Allowed fields for profile updates."""
    name: Optional[str] = None
    profile_pic: Optional[str] = None
    bio: Optional[str] = None

class RoleUpdate(BaseModel):
    new_role: str
