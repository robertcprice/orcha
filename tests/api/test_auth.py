"""Tests for authentication endpoints."""
import pytest
from fastapi import status


def test_register_user(client):
    """Test user registration."""
    response = client.post(
        "/auth/register",
        json={
            "email": "newuser@example.com",
            "username": "newuser",
            "full_name": "New User",
            "password": "securepass123"
        }
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["username"] == "newuser"
    assert "hashed_password" not in data
    assert "id" in data


def test_register_duplicate_user(client, test_user):
    """Test registration with duplicate username fails."""
    response = client.post(
        "/auth/register",
        json={
            "email": "another@example.com",
            "username": "testuser",  # Duplicate username
            "password": "securepass123"
        }
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "already registered" in response.json()["detail"]


def test_login_success(client, test_user):
    """Test successful login."""
    response = client.post(
        "/auth/login",
        data={"username": "testuser", "password": "testpass123"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_credentials(client, test_user):
    """Test login with invalid credentials."""
    response = client.post(
        "/auth/login",
        data={"username": "testuser", "password": "wrongpassword"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_login_nonexistent_user(client):
    """Test login with nonexistent user."""
    response = client.post(
        "/auth/login",
        data={"username": "nonexistent", "password": "password123"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_current_user(client, auth_headers):
    """Test getting current user information."""
    response = client.get("/auth/me", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"


def test_get_current_user_unauthorized(client):
    """Test accessing protected endpoint without authentication."""
    response = client.get("/auth/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_current_user_invalid_token(client):
    """Test accessing protected endpoint with invalid token."""
    response = client.get(
        "/auth/me",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
