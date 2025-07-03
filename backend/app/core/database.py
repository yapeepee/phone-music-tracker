"""Database session management for sync operations (Celery tasks)."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings


# Create sync engine for Celery tasks
def get_sync_database_url():
    """Convert async database URL to sync."""
    if settings.DATABASE_URL.startswith("postgresql+asyncpg://"):
        return settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    return settings.DATABASE_URL


sync_engine = create_engine(
    get_sync_database_url(),
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

# Create sync session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=sync_engine
)


def get_db_sync() -> Session:
    """Get synchronous database session for Celery tasks."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()