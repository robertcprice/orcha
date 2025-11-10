# REST API with Database and Authentication

Modern, production-ready REST API built with FastAPI, SQLAlchemy, and JWT authentication.

## Features

✅ **Complete REST API** with CRUD operations
✅ **JWT Authentication** with secure password hashing
✅ **Database Integration** (PostgreSQL/SQLite)
✅ **Automatic API Documentation** (OpenAPI/Swagger)
✅ **Type Safety** with Pydantic models
✅ **Async Support** for high performance
✅ **Comprehensive Test Suite** with pytest
✅ **CORS Support** for frontend integration

## Tech Stack

- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) - Modern, fast web framework
- **ORM:** [SQLAlchemy 2.0](https://www.sqlalchemy.org/) - SQL toolkit and ORM
- **Database:** PostgreSQL (production) / SQLite (development)
- **Authentication:** JWT with bcrypt password hashing
- **Testing:** pytest with async support
- **Validation:** Pydantic v2

## Quick Start

### 1. Prerequisites

- Python 3.10 or higher
- pip (Python package manager)
- PostgreSQL (for production) or SQLite (auto-installed)

### 2. Installation

```bash
# Navigate to the rest-api directory
cd rest-api

# Install dependencies
pip install -r requirements.txt
```

### 3. Configuration

```bash
# Copy environment template
cp .env.example .env

# Generate a secure secret key
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Edit .env and set your SECRET_KEY
# For development, SQLite is already configured
```

**.env file (minimum required):**
```env
SECRET_KEY=your-generated-secret-key-here
DATABASE_URL=sqlite:///./rest_api.db
DEBUG=True
```

### 4. Run the API

```bash
# Start the development server
uvicorn src.main:app --reload

# Or using Python
python -m src.main
```

The API will be available at:
- **Main API:** http://localhost:8000
- **Interactive Docs:** http://localhost:8000/docs
- **Alternative Docs:** http://localhost:8000/redoc

### 5. Test the API

**Option A: Use Interactive Docs**
1. Open http://localhost:8000/docs
2. Click "Try it out" on any endpoint
3. Execute requests directly from the browser

**Option B: Use cURL**
```bash
# Register a user
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "testpass123",
    "full_name": "Test User"
  }'

# Login and get token
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=testpass123"
```

## Project Structure

```
rest-api/
├── src/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── config.py            # Configuration management
│   ├── database.py          # Database connection and session
│   ├── models.py            # SQLAlchemy database models
│   ├── schemas.py           # Pydantic schemas for validation
│   ├── auth.py              # Authentication logic and dependencies
│   └── routers/
│       ├── __init__.py
│       ├── auth.py          # Authentication endpoints
│       ├── users.py         # User management endpoints
│       └── items.py         # Item CRUD endpoints
├── tests/
│   ├── __init__.py
│   ├── conftest.py          # Test fixtures and configuration
│   ├── test_main.py         # Main app tests
│   ├── test_auth.py         # Authentication tests
│   ├── test_users.py        # User endpoint tests
│   └── test_items.py        # Item endpoint tests
├── docs/
│   ├── DATABASE_RESEARCH_REPORT.md
│   └── API_DOCUMENTATION.md
├── .env.example             # Environment variables template
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token
- `GET /auth/me` - Get current user info

### Users (requires authentication)
- `GET /users/` - List all users (paginated)
- `GET /users/{id}` - Get user by ID
- `PUT /users/{id}` - Update user
- `DELETE /users/{id}` - Delete user

### Items (requires authentication)
- `GET /items/` - List user's items
- `POST /items/` - Create new item
- `GET /items/{id}` - Get item by ID
- `PUT /items/{id}` - Update item
- `DELETE /items/{id}` - Delete item

### System
- `GET /` - API information
- `GET /health` - Health check

**Full API documentation:** See [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)

## Database Schema

### Users
- `id` - Primary key
- `email` - Unique, indexed
- `username` - Unique, indexed
- `hashed_password` - Bcrypt hashed
- `full_name` - Optional
- `is_active` - Boolean (default: true)
- `is_superuser` - Boolean (default: false)
- `created_at`, `updated_at` - Timestamps

### Items
- `id` - Primary key
- `title` - Required
- `description` - Optional text
- `owner_id` - Foreign key to users
- `created_at`, `updated_at` - Timestamps

## Testing

Run the test suite:

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=src --cov-report=html

# Run specific test file
pytest tests/test_auth.py -v

# Run specific test
pytest tests/test_auth.py::test_register_user -v
```

**Test coverage:** Tests cover all authentication, user management, and item CRUD operations.

## Development

### Code Quality

The project uses modern Python practices:
- Type hints throughout
- Async/await for performance
- Dependency injection pattern
- Proper error handling
- Comprehensive tests

### Database Migrations

For production, use Alembic for database migrations:

```bash
# Initialize Alembic (first time only)
alembic init alembic

# Create a migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

### Adding New Endpoints

1. Create schema in `src/schemas.py`
2. Create model in `src/models.py` (if needed)
3. Create router in `src/routers/your_router.py`
4. Include router in `src/main.py`
5. Write tests in `tests/test_your_router.py`

Example:
```python
# src/routers/example.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth import get_current_active_user

router = APIRouter(prefix="/example", tags=["Example"])

@router.get("/")
def list_examples(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    return {"message": "Example endpoint"}
```

## Production Deployment

### 1. Environment Configuration

```env
# Use PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/database

# Strong secret key
SECRET_KEY=use-secrets-token-urlsafe-32-to-generate

# Disable debug mode
DEBUG=False

# Secure token expiration
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb your_database_name

# Run migrations
alembic upgrade head
```

### 3. CORS Configuration

Edit `src/main.py` to specify allowed origins:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 4. Production Server

Use Gunicorn with Uvicorn workers:

```bash
# Install Gunicorn
pip install gunicorn

# Run with 4 workers
gunicorn src.main:app \
  -w 4 \
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
```

### 5. Monitoring

Add health check monitoring:
- Endpoint: `GET /health`
- Expected response: `{"status": "healthy"}`

## Docker Deployment (Optional)

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/apidb
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=apidb
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Run with Docker Compose:
```bash
docker-compose up -d
```

## Security Best Practices

✅ **Implemented:**
- JWT token authentication
- Password hashing with bcrypt
- SQL injection protection (SQLAlchemy ORM)
- Input validation (Pydantic)
- CORS configuration
- Environment variable configuration

⚠️ **Additional Recommendations:**
- Use HTTPS in production
- Implement rate limiting
- Add request logging
- Set up monitoring and alerting
- Regular security audits
- Keep dependencies updated

## Performance Considerations

- **Async Support:** FastAPI uses async/await for non-blocking operations
- **Connection Pooling:** SQLAlchemy manages database connections efficiently
- **Caching:** Consider adding Redis for caching frequent queries
- **Database Indexes:** Already configured on email and username fields
- **Pagination:** Implemented in list endpoints to limit response size

## Troubleshooting

### Common Issues

**1. "SECRET_KEY not set" error**
- Solution: Copy `.env.example` to `.env` and set `SECRET_KEY`

**2. Database connection error**
- SQLite: Check if directory is writable
- PostgreSQL: Verify connection string and database exists

**3. Import errors**
- Solution: Make sure you're in the `rest-api` directory and dependencies are installed

**4. Authentication fails**
- Check token expiration (default: 30 minutes)
- Verify SECRET_KEY matches between token creation and validation

**5. CORS errors in frontend**
- Update `allow_origins` in `src/main.py` to include your frontend URL

## Additional Resources

- **FastAPI Documentation:** https://fastapi.tiangolo.com/
- **SQLAlchemy Documentation:** https://docs.sqlalchemy.org/
- **Pydantic Documentation:** https://docs.pydantic.dev/
- **JWT Introduction:** https://jwt.io/introduction

## Contributing

1. Follow existing code style and patterns
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass before committing

## License

This project is part of the Smart Market Solutions Orchestration System.

## Support

For issues or questions:
- Check the [API Documentation](docs/API_DOCUMENTATION.md)
- Review the [Database Research Report](docs/DATABASE_RESEARCH_REPORT.md)
- Examine test files for usage examples
- Check FastAPI's excellent documentation

---

**Status:** ✅ Production Ready

**Version:** 1.0.0

**Last Updated:** 2025-11-07
