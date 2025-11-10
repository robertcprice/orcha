"""
Application configuration
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings."""

    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # API
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "MCP Orchestration API"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8080"
    ]

    # MCP Orchestration
    MCP_SERVERS: List[str] = [
        "claude",
        "chatgpt",
        "deepseek",
        "grok",
        "gemini",
        "codex",
        "semgrep",
        "redis"
    ]
    CONFIDENCE_THRESHOLD: float = 95.0
    DEFAULT_BUDGET_LIMIT: float = 10.0  # USD

    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_CHANNEL: str = "orchestration:jobs"

    # Storage
    WORKSPACE_DIR: str = "./workspace"
    OBSIDIAN_VAULT_DIR: str = "./obsidian-vault"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra environment variables


settings = Settings()
