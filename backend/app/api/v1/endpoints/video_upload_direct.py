"""Direct video upload endpoint that doesn't require session ID."""
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.storage import StorageService
from app.schemas.video_processing import VideoUploadResponse
from app.core.config import settings
import uuid

router = APIRouter()


def get_storage_service():
    """Get storage service instance."""
    return StorageService(
        bucket_name=settings.S3_BUCKET_NAME,
        endpoint_url=settings.S3_ENDPOINT_URL,
        access_key=settings.S3_ACCESS_KEY or settings.AWS_ACCESS_KEY_ID,
        secret_key=settings.S3_SECRET_KEY or settings.AWS_SECRET_ACCESS_KEY
    )


@router.post("/upload-direct", response_model=VideoUploadResponse)
async def upload_video_direct(
    video: UploadFile = File(...),
    local_session_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload video directly without requiring a session ID."""
    # Validate file type
    if not any(video.filename.lower().endswith(fmt) for fmt in settings.SUPPORTED_VIDEO_FORMATS):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported video format. Supported formats: {settings.SUPPORTED_VIDEO_FORMATS}"
        )
    
    # Check file size
    video.file.seek(0, 2)
    file_size = video.file.tell()
    video.file.seek(0)
    
    if file_size > settings.MAX_VIDEO_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"Video file too large. Maximum size: {settings.MAX_VIDEO_SIZE_MB}MB"
        )
    
    # Upload to storage
    storage_service = get_storage_service()
    video_id = str(uuid.uuid4())
    video_key = f"videos/temp/user_{current_user.id}/{video_id}_{video.filename}"
    
    # Save video to temporary file
    import tempfile
    with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
        content = await video.read()
        tmp_file.write(content)
        tmp_file.flush()
        
        # Upload to S3
        await storage_service.upload_file(
            tmp_file.name,
            video_key,
            content_type=video.content_type
        )
    
    # Return response with video URL for later association
    return VideoUploadResponse(
        session_id=0,  # No session ID yet
        video_url=video_key,
        file_size=file_size,
        duration=0,  # Will be updated after processing
        processing_status=None,
        task_id=None,
        # Include metadata to help with later association
        metadata={
            "video_id": video_id,
            "user_id": current_user.id,
            "local_session_id": local_session_id,
            "uploaded_at": datetime.utcnow().isoformat()
        }
    )