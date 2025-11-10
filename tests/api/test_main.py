"""Tests for main application endpoints."""
from fastapi import status


def test_root_endpoint(client):
    """Test root endpoint."""
    response = client.get("/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "message" in data
    assert "version" in data
    assert "docs" in data


def test_health_check(client):
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "healthy"


def test_openapi_docs_available(client):
    """Test that OpenAPI documentation is accessible."""
    response = client.get("/docs")
    assert response.status_code == status.HTTP_200_OK

    response = client.get("/redoc")
    assert response.status_code == status.HTTP_200_OK


def test_openapi_schema(client):
    """Test OpenAPI schema endpoint."""
    response = client.get("/openapi.json")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "info" in data
    assert "paths" in data
    assert data["info"]["title"] == "REST API with Authentication"
