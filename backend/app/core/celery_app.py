"""Celery configuration and app initialization."""
import os
from celery import Celery
from celery.signals import setup_logging
from app.core.config import settings

# Create Celery instance
celery_app = Celery(
    "music_tracker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.video_tasks"]
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    result_expires=3600,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour hard limit
    task_soft_time_limit=3000,  # 50 minutes soft limit
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=50,
    beat_schedule={
        # Add scheduled tasks here if needed
        "cleanup-expired-videos": {
            "task": "app.tasks.video_tasks.cleanup_expired_videos",
            "schedule": 3600.0,  # Run every hour
        },
    },
)

# Configure task routes
celery_app.conf.task_routes = {
    "app.tasks.video_tasks.*": {"queue": "video_processing"},
}

# Configure task priorities
celery_app.conf.task_annotations = {
    "app.tasks.video_tasks.process_video": {"priority": 5},
    "app.tasks.video_tasks.generate_thumbnail": {"priority": 3},
    "app.tasks.video_tasks.extract_audio": {"priority": 4},
}

@setup_logging.connect
def config_loggers(*args, **kwargs):
    """Configure Celery logging."""
    from logging.config import dictConfig
    from app.core.logging import LOGGING_CONFIG
    
    dictConfig(LOGGING_CONFIG)