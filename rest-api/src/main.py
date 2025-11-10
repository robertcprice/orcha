"""
FastAPI REST API for MCP Orchestration System
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from contextlib import asynccontextmanager

from .api.v1 import orchestration, telemetry, jobs
from .core.config import settings
from .core.logging_config import setup_logging

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown."""
    # Startup
    logger.info("Starting MCP Orchestration API")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"CORS origins: {settings.CORS_ORIGINS}")

    yield

    # Shutdown
    logger.info("Shutting down MCP Orchestration API")


# Create FastAPI app
app = FastAPI(
    title="MCP Orchestration API",
    description="REST API for Multi-AI Orchestration with Model Context Protocol",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "mcp-orchestration-api",
        "version": "1.0.0"
    }


# Include routers
app.include_router(
    orchestration.router,
    prefix="/api/v1/orchestration",
    tags=["orchestration"]
)

app.include_router(
    telemetry.router,
    prefix="/api/v1/telemetry",
    tags=["telemetry"]
)

app.include_router(
    jobs.router,
    prefix="/api/v1/jobs",
    tags=["jobs"]
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": "An unexpected error occurred",
            "detail": str(exc) if settings.DEBUG else None
        }
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
