# Music Practice Tracker Backend

FastAPI backend for the Music Practice Tracker application.

## Features

- 🔐 JWT Authentication with refresh tokens
- 👥 Role-based access control (Student/Teacher/Admin)
- 🗄️ PostgreSQL with TimescaleDB for time-series data
- 🚀 Redis for caching and task queues
- 📦 S3-compatible storage (MinIO for local dev)
- ⚡ Async/await throughout
- 🔄 Celery for background tasks
- 📊 Domain-driven design architecture

## Tech Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL + TimescaleDB
- **Cache**: Redis
- **Queue**: Celery + Redis
- **Storage**: S3/MinIO
- **Auth**: JWT (python-jose)
- **ORM**: SQLAlchemy 2.0 (async)

## Project Structure

```
backend/
├── app/
│   ├── api/           # API endpoints
│   │   ├── deps.py    # Dependencies (auth, db)
│   │   └── v1/        # API v1 endpoints
│   ├── core/          # Core functionality
│   │   ├── config.py  # Settings
│   │   └── security.py # Password hashing, JWT
│   ├── db/            # Database
│   │   ├── base_class.py
│   │   └── session.py
│   ├── models/        # SQLAlchemy models
│   ├── schemas/       # Pydantic schemas
│   ├── services/      # Business logic
│   │   ├── auth/      # Authentication service
│   │   ├── practice/  # Practice sessions
│   │   ├── media/     # Video handling
│   │   └── analytics/ # Data analysis
│   └── main.py        # FastAPI app
├── tests/             # Test files
├── alembic/           # Database migrations
├── Dockerfile
└── requirements.txt
```

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Python 3.11+ (for local development)

### Quick Start with Docker

1. Clone the repository:
```bash
cd music-tracker
```

2. Copy environment variables:
```bash
cp backend/.env.example backend/.env
```

3. Start the services:
```bash
docker-compose up -d
```

4. The API will be available at http://localhost:8000
   - API docs: http://localhost:8000/api/v1/docs
   - MinIO console: http://localhost:9001 (minioadmin/minioadmin)

### Local Development

1. Create a virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

3. Run services:
```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis minio

# Run the API
uvicorn app.main:app --reload
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user

### Practice Sessions (Coming soon)
- `POST /api/v1/sessions` - Create session
- `GET /api/v1/sessions` - List sessions
- `GET /api/v1/sessions/{id}` - Get session details
- `PUT /api/v1/sessions/{id}` - Update session

## Database Migrations

Using Alembic for database migrations:

```bash
# Create a new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/test_auth.py
```

## Development

### Code Style

The project uses:
- `black` for code formatting
- `isort` for import sorting
- `flake8` for linting
- `mypy` for type checking

Run all checks:
```bash
black app tests
isort app tests
flake8 app tests
mypy app
```

### Pre-commit Hooks

Install pre-commit hooks:
```bash
pre-commit install
```

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `SECRET_KEY` - JWT signing key (generate a secure one for production)
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `S3_BUCKET_NAME` - S3 bucket for media storage

## Architecture Notes

- **Domain-Driven Design**: Services are organized by domain (auth, practice, media, etc.)
- **Async First**: All database operations and API endpoints are async
- **Type Safety**: Full type hints with Pydantic validation
- **12-Factor**: Configuration through environment variables
- **Containerized**: Everything runs in Docker for consistency