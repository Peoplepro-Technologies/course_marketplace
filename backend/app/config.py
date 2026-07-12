"""
config.py — Application settings loaded from environment variables.

Uses pydantic-settings to automatically read from .env file and provide
typed configuration values throughout the app.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """
    All app configuration is pulled from environment variables / .env file.
    Pydantic validates types and provides defaults where appropriate.
    """

    # ── Database ──────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/course_marketplace"

    # ── Redis ─────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_ENABLED: bool = False

    # ── Keycloak ──────────────────────────────────────────────────────
    KEYCLOAK_URL: str = "http://localhost:8080"
    KEYCLOAK_REALM: str = "course-marketplace"
    KEYCLOAK_CLIENT_ID: str = "course-frontend"

    # ── Computed Properties ───────────────────────────────────────────
    @property
    def JWKS_URL(self) -> str:
        """URL to fetch the JSON Web Key Set for token verification."""
        return (
            f"{self.KEYCLOAK_URL}/realms/{self.KEYCLOAK_REALM}"
            f"/protocol/openid-connect/certs"
        )

    @property
    def KEYCLOAK_ISSUER(self) -> str:
        """Expected issuer claim in JWT tokens."""
        return f"{self.KEYCLOAK_URL}/realms/{self.KEYCLOAK_REALM}"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """
    Returns a cached Settings instance so we only read .env once.
    Use this function as a dependency or import directly.
    """
    return Settings()
