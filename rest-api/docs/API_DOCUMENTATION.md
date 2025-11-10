# REST API Documentation

## Overview

Complete REST API with JWT authentication, built with FastAPI and SQLAlchemy. Supports user management, authentication, and item CRUD operations.

**Base URL:** `http://localhost:8000`
**API Docs:** `http://localhost:8000/docs` (Interactive Swagger UI)
**ReDoc:** `http://localhost:8000/redoc` (Alternative documentation)

## Quick Start

### 1. Setup Environment

```bash
cd rest-api
cp .env.example .env
# Edit .env and set SECRET_KEY
pip install -r requirements.txt
```

### 2. Run the API

```bash
# From rest-api directory
uvicorn src.main:app --reload

# Or using Python
python -m src.main
```

### 3. Access Interactive Docs

Open your browser to: `http://localhost:8000/docs`

## Authentication

The API uses JWT (JSON Web Token) for authentication. Most endpoints require authentication.

### Get Access Token

**POST** `/auth/login`

```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=johndoe&password=secret"
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Using the Token

Include the token in the Authorization header for protected endpoints:

```bash
curl -X GET "http://localhost:8000/users/" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## API Endpoints

### Root & Health

#### GET `/`
Get API information (no authentication required)

**Response:**
```json
{
  "message": "REST API with Authentication",
  "version": "1.0.0",
  "docs": "/docs",
  "redoc": "/redoc"
}
```

#### GET `/health`
Health check endpoint (no authentication required)

**Response:**
```json
{
  "status": "healthy"
}
```

---

### Authentication Endpoints

#### POST `/auth/register`
Register a new user (no authentication required)

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "strongpassword123",
  "full_name": "John Doe"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "johndoe",
  "full_name": "John Doe",
  "is_active": true,
  "is_superuser": false,
  "created_at": "2025-11-07T10:30:00",
  "updated_at": "2025-11-07T10:30:00"
}
```

**Error (400 Bad Request):**
```json
{
  "detail": "Email or username already registered"
}
```

#### POST `/auth/login`
Login and receive JWT token (no authentication required)

**Request Body (form-urlencoded):**
```
username=johndoe
password=strongpassword123
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Error (401 Unauthorized):**
```json
{
  "detail": "Incorrect username or password"
}
```

#### GET `/auth/me`
Get current authenticated user information (requires authentication)

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Response (200 OK):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "johndoe",
  "full_name": "John Doe",
  "is_active": true,
  "is_superuser": false,
  "created_at": "2025-11-07T10:30:00",
  "updated_at": "2025-11-07T10:30:00"
}
```

---

### User Management Endpoints

All user endpoints require authentication.

#### GET `/users/`
List all users (paginated, requires authentication)

**Query Parameters:**
- `skip` (optional, default: 0): Number of records to skip
- `limit` (optional, default: 100): Maximum records to return

**Example:**
```bash
curl -X GET "http://localhost:8000/users/?skip=0&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "email": "user@example.com",
    "username": "johndoe",
    "full_name": "John Doe",
    "is_active": true,
    "is_superuser": false,
    "created_at": "2025-11-07T10:30:00",
    "updated_at": "2025-11-07T10:30:00"
  }
]
```

#### GET `/users/{user_id}`
Get user by ID (requires authentication)

**Response (200 OK):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "johndoe",
  "full_name": "John Doe",
  "is_active": true,
  "is_superuser": false,
  "created_at": "2025-11-07T10:30:00",
  "updated_at": "2025-11-07T10:30:00"
}
```

**Error (404 Not Found):**
```json
{
  "detail": "User not found"
}
```

#### PUT `/users/{user_id}`
Update user information (requires authentication, users can only update themselves unless superuser)

**Request Body:**
```json
{
  "full_name": "John Updated Doe",
  "email": "newemail@example.com"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "email": "newemail@example.com",
  "username": "johndoe",
  "full_name": "John Updated Doe",
  "is_active": true,
  "is_superuser": false,
  "created_at": "2025-11-07T10:30:00",
  "updated_at": "2025-11-07T11:30:00"
}
```

**Error (403 Forbidden):**
```json
{
  "detail": "Not authorized to update this user"
}
```

#### DELETE `/users/{user_id}`
Delete user (requires authentication, users can only delete themselves unless superuser)

**Response (204 No Content)**

**Error (403 Forbidden):**
```json
{
  "detail": "Not authorized to delete this user"
}
```

---

### Item Management Endpoints

All item endpoints require authentication.

#### GET `/items/`
List all items owned by current user (requires authentication)

**Query Parameters:**
- `skip` (optional, default: 0)
- `limit` (optional, default: 100)

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "title": "My First Item",
    "description": "This is a test item",
    "owner_id": 1,
    "created_at": "2025-11-07T10:30:00",
    "updated_at": "2025-11-07T10:30:00"
  }
]
```

#### POST `/items/`
Create a new item (requires authentication)

**Request Body:**
```json
{
  "title": "New Item",
  "description": "Item description here"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "title": "New Item",
  "description": "Item description here",
  "owner_id": 1,
  "created_at": "2025-11-07T10:30:00",
  "updated_at": "2025-11-07T10:30:00"
}
```

#### GET `/items/{item_id}`
Get item by ID (requires authentication, only owner can access)

**Response (200 OK):**
```json
{
  "id": 1,
  "title": "My First Item",
  "description": "This is a test item",
  "owner_id": 1,
  "created_at": "2025-11-07T10:30:00",
  "updated_at": "2025-11-07T10:30:00"
}
```

**Error (403 Forbidden):**
```json
{
  "detail": "Not authorized to access this item"
}
```

#### PUT `/items/{item_id}`
Update item (requires authentication, only owner can update)

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "title": "Updated Title",
  "description": "Updated description",
  "owner_id": 1,
  "created_at": "2025-11-07T10:30:00",
  "updated_at": "2025-11-07T12:30:00"
}
```

#### DELETE `/items/{item_id}`
Delete item (requires authentication, only owner can delete)

**Response (204 No Content)**

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Items Table
```sql
CREATE TABLE items (
    id INTEGER PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Error Responses

All error responses follow this format:

```json
{
  "detail": "Error message here"
}
```

### Common HTTP Status Codes

- **200 OK** - Request successful
- **201 Created** - Resource created successfully
- **204 No Content** - Request successful, no response body
- **400 Bad Request** - Invalid request data
- **401 Unauthorized** - Authentication required or failed
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Resource not found
- **422 Unprocessable Entity** - Validation error
- **500 Internal Server Error** - Server error

## Testing the API

### Using cURL

**Register a user:**
```bash
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "testpass123",
    "full_name": "Test User"
  }'
```

**Login:**
```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=testpass123"
```

**Create an item:**
```bash
curl -X POST "http://localhost:8000/items/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Item",
    "description": "This is a test"
  }'
```

### Using Python requests

```python
import requests

BASE_URL = "http://localhost:8000"

# Register
response = requests.post(f"{BASE_URL}/auth/register", json={
    "email": "test@example.com",
    "username": "testuser",
    "password": "testpass123",
    "full_name": "Test User"
})
print(response.json())

# Login
response = requests.post(f"{BASE_URL}/auth/login", data={
    "username": "testuser",
    "password": "testpass123"
})
token = response.json()["access_token"]

# Create item
headers = {"Authorization": f"Bearer {token}"}
response = requests.post(f"{BASE_URL}/items/",
    headers=headers,
    json={
        "title": "Test Item",
        "description": "This is a test"
    }
)
print(response.json())
```

## Running Tests

```bash
cd rest-api
pytest tests/ -v
pytest tests/ --cov=src --cov-report=html
```

## Configuration

All configuration is managed through environment variables in `.env` file:

```env
# Database
DATABASE_URL=sqlite:///./rest_api.db  # For dev
# DATABASE_URL=postgresql://user:pass@localhost:5432/dbname  # For prod

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API
API_TITLE=REST API with Authentication
API_VERSION=1.0.0
API_DESCRIPTION=Complete REST API with JWT authentication

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=True
```

## Production Deployment

For production deployment:

1. **Set strong SECRET_KEY**
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

2. **Use PostgreSQL instead of SQLite**
   ```env
   DATABASE_URL=postgresql://user:password@host:5432/database
   ```

3. **Disable DEBUG mode**
   ```env
   DEBUG=False
   ```

4. **Configure CORS properly**
   Edit `src/main.py` to allow only specific origins

5. **Use production ASGI server**
   ```bash
   gunicorn src.main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```

## Support

For issues or questions:
- Check the interactive docs at `/docs`
- Review test files in `tests/` for examples
- Consult FastAPI documentation: https://fastapi.tiangolo.com/
