"""Application configuration management."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "sqlite:///./rest_api.db"

    # Security
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # API
    api_title: str = "REST API with Authentication"
    api_version: str = "1.0.0"
    api_description: str = "Complete REST API with JWT authentication"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )


# Global settings instance
settings = Settings()
