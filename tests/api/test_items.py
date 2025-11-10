"""Tests for item management endpoints."""
import pytest
from fastapi import status


@pytest.fixture
def test_item(db, test_user):
    """Create a test item."""
    from src.models import Item

    item = Item(
        title="Test Item",
        description="Test Description",
        owner_id=test_user.id
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def test_create_item(client, auth_headers):
    """Test creating an item."""
    response = client.post(
        "/items/",
        headers=auth_headers,
        json={
            "title": "New Item",
            "description": "Item description"
        }
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["title"] == "New Item"
    assert data["description"] == "Item description"
    assert "id" in data
    assert "owner_id" in data


def test_create_item_unauthorized(client):
    """Test creating item without authentication."""
    response = client.post(
        "/items/",
        json={"title": "New Item"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_list_items(client, auth_headers, test_item):
    """Test listing items."""
    response = client.get("/items/", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert any(item["id"] == test_item.id for item in data)


def test_list_items_only_shows_own(client, auth_headers, db, test_item):
    """Test that users only see their own items."""
    from src.models import User, Item
    from src.auth import get_password_hash

    # Create another user with an item
    other_user = User(
        email="other@example.com",
        username="otheruser",
        hashed_password=get_password_hash("password123"),
        is_active=True
    )
    db.add(other_user)
    db.commit()

    other_item = Item(
        title="Other User's Item",
        description="Should not be visible",
        owner_id=other_user.id
    )
    db.add(other_item)
    db.commit()

    # List items as test_user
    response = client.get("/items/", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    # Should only see own items
    item_ids = [item["id"] for item in data]
    assert test_item.id in item_ids
    assert other_item.id not in item_ids


def test_get_item(client, auth_headers, test_item):
    """Test getting item by ID."""
    response = client.get(f"/items/{test_item.id}", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == test_item.id
    assert data["title"] == test_item.title


def test_get_other_users_item_forbidden(client, auth_headers, db):
    """Test getting another user's item is forbidden."""
    from src.models import User, Item
    from src.auth import get_password_hash

    # Create another user with an item
    other_user = User(
        email="other@example.com",
        username="otheruser",
        hashed_password=get_password_hash("password123"),
        is_active=True
    )
    db.add(other_user)
    db.commit()

    other_item = Item(
        title="Other User's Item",
        owner_id=other_user.id
    )
    db.add(other_item)
    db.commit()
    db.refresh(other_item)

    response = client.get(f"/items/{other_item.id}", headers=auth_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_update_item(client, auth_headers, test_item):
    """Test updating an item."""
    response = client.put(
        f"/items/{test_item.id}",
        headers=auth_headers,
        json={"title": "Updated Title"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["title"] == "Updated Title"
    assert data["description"] == test_item.description  # Unchanged


def test_update_other_users_item_forbidden(client, auth_headers, db):
    """Test updating another user's item is forbidden."""
    from src.models import User, Item
    from src.auth import get_password_hash

    # Create another user with an item
    other_user = User(
        email="other@example.com",
        username="otheruser",
        hashed_password=get_password_hash("password123"),
        is_active=True
    )
    db.add(other_user)
    db.commit()

    other_item = Item(
        title="Other User's Item",
        owner_id=other_user.id
    )
    db.add(other_item)
    db.commit()
    db.refresh(other_item)

    response = client.put(
        f"/items/{other_item.id}",
        headers=auth_headers,
        json={"title": "Hacked Title"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_delete_item(client, auth_headers, test_item):
    """Test deleting an item."""
    response = client.delete(f"/items/{test_item.id}", headers=auth_headers)
    assert response.status_code == status.HTTP_204_NO_CONTENT

    # Verify item is deleted
    response = client.get(f"/items/{test_item.id}", headers=auth_headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_delete_other_users_item_forbidden(client, auth_headers, db):
    """Test deleting another user's item is forbidden."""
    from src.models import User, Item
    from src.auth import get_password_hash

    # Create another user with an item
    other_user = User(
        email="other@example.com",
        username="otheruser",
        hashed_password=get_password_hash("password123"),
        is_active=True
    )
    db.add(other_user)
    db.commit()

    other_item = Item(
        title="Other User's Item",
        owner_id=other_user.id
    )
    db.add(other_item)
    db.commit()
    db.refresh(other_item)

    response = client.delete(f"/items/{other_item.id}", headers=auth_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN
