"""Tests for user management endpoints."""
import pytest
from fastapi import status


def test_list_users(client, auth_headers, test_user):
    """Test listing users."""
    response = client.get("/users/", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


def test_list_users_unauthorized(client):
    """Test listing users without authentication."""
    response = client.get("/users/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_user(client, auth_headers, test_user):
    """Test getting user by ID."""
    response = client.get(f"/users/{test_user.id}", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == test_user.id
    assert data["username"] == test_user.username


def test_get_nonexistent_user(client, auth_headers):
    """Test getting nonexistent user."""
    response = client.get("/users/99999", headers=auth_headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_update_own_user(client, auth_headers, test_user):
    """Test updating own user information."""
    response = client.put(
        f"/users/{test_user.id}",
        headers=auth_headers,
        json={"full_name": "Updated Name"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] == "Updated Name"


def test_update_other_user_forbidden(client, auth_headers, db):
    """Test updating another user is forbidden."""
    from src.models import User
    from src.auth import get_password_hash

    # Create another user
    other_user = User(
        email="other@example.com",
        username="otheruser",
        hashed_password=get_password_hash("password123"),
        is_active=True
    )
    db.add(other_user)
    db.commit()
    db.refresh(other_user)

    response = client.put(
        f"/users/{other_user.id}",
        headers=auth_headers,
        json={"full_name": "Hacked Name"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_delete_own_user(client, auth_headers, test_user):
    """Test deleting own user account."""
    response = client.delete(f"/users/{test_user.id}", headers=auth_headers)
    assert response.status_code == status.HTTP_204_NO_CONTENT

    # Verify user is deleted
    response = client.get(f"/users/{test_user.id}", headers=auth_headers)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED  # Token no longer valid


def test_delete_other_user_forbidden(client, auth_headers, db):
    """Test deleting another user is forbidden."""
    from src.models import User
    from src.auth import get_password_hash

    # Create another user
    other_user = User(
        email="other@example.com",
        username="otheruser",
        hashed_password=get_password_hash("password123"),
        is_active=True
    )
    db.add(other_user)
    db.commit()
    db.refresh(other_user)

    response = client.delete(f"/users/{other_user.id}", headers=auth_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN
