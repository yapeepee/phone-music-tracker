"""API v1 router aggregation."""
from fastapi import APIRouter

# Import endpoint routers
from app.api.v1 import auth, sessions, videos
from app.api.v1.endpoints import video_processing, tus_upload, analytics, teachers, feedback, tags, notifications, forum, forum_media, reputation, challenges, schedule, notification_preferences, practice_segments, tempo, timer, current_pieces, practice_partners

# Create main API router
api_router = APIRouter()

# Health check endpoints for testing
@api_router.get("/health")
async def health_check():
    return {"status": "ok", "message": "API is running"}

@api_router.get("/test")
async def test_endpoint():
    return {
        "status": "success", 
        "message": "如果你能看到這個訊息，表示連接成功！",
        "api_version": "v1"
    }

# Include routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
api_router.include_router(
    videos.router,
    prefix="/videos",
    tags=["videos"]
)
api_router.include_router(
    video_processing.router,
    prefix="/videos",
    tags=["video-processing"]
)
api_router.include_router(
    tus_upload.router,
    prefix="/videos",
    tags=["tus-upload"]
)
api_router.include_router(
    analytics.router,
    prefix="",  # Analytics endpoints already include /sessions or /analytics in their paths
    tags=["analytics"]
)
api_router.include_router(
    teachers.router,
    prefix="/teachers",
    tags=["teachers"]
)
api_router.include_router(
    feedback.router,
    prefix="/feedback",
    tags=["feedback"]
)
api_router.include_router(
    tags.router,
    prefix="/tags",
    tags=["tags"]
)
api_router.include_router(
    notifications.router,
    prefix="/notifications",
    tags=["notifications"]
)
api_router.include_router(
    forum.router,
    prefix="/forum",
    tags=["forum"]
)
api_router.include_router(
    forum_media.router,
    prefix="/forum/media",
    tags=["forum-media"]
)
api_router.include_router(
    reputation.router,
    prefix="/reputation",
    tags=["reputation"]
)
api_router.include_router(
    challenges.router,
    prefix="/challenges",
    tags=["challenges"]
)
api_router.include_router(
    schedule.router,
    prefix="/schedule",
    tags=["schedule"]
)
api_router.include_router(
    notification_preferences.router,
    prefix="/notification-preferences",
    tags=["notification-preferences"]
)
api_router.include_router(
    practice_segments.router,
    prefix="/practice-segments",
    tags=["practice-segments"]
)
api_router.include_router(
    tempo.router,
    prefix="/tempo",
    tags=["tempo"]
)
api_router.include_router(
    timer.router,
    prefix="/timer",
    tags=["timer"]
)
api_router.include_router(
    current_pieces.router,
    prefix="/current-pieces",
    tags=["current-pieces"]
)
api_router.include_router(
    practice_partners.router,
    prefix="/practice-partners",
    tags=["practice-partners"]
)