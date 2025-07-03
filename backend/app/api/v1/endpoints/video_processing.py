"""Video processing API endpoints."""
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.practice import PracticeSession, ProcessingStatus, VideoQuality
from app.services.storage import StorageService
from app.tasks.video_tasks import process_video, process_video_batch
from app.schemas.video_processing import (
    VideoProcessingRequest,
    VideoProcessingStatus,
    VideoUploadResponse,
    VideoDownloadUrl,
    BatchProcessingRequest,
    BatchProcessingResult
)
from app.core.config import settings

router = APIRouter()


@router.post("/upload-multipart/{session_id}", response_model=VideoUploadResponse)
async def upload_video_multipart(
    session_id: str,  # Changed to str to handle both DB IDs and temporary IDs
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload video using standard multipart form data (for React Native)."""
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Upload request - session_id: {session_id}, user: {current_user.email}, filename: {video.filename}")
    
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
    
    # Try to get practice session if session_id looks like a database ID
    session = None
    is_temp_session = False
    
    # Check if it's a UUID (database session)
    try:
        # Try to parse as UUID
        session_uuid = uuid.UUID(session_id)
        session = await db.get(PracticeSession, session_uuid)
        if session and session.student_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to upload video for this session")
    except (ValueError, AttributeError):
        # It's not a UUID, so it's a temporary session ID (like timestamp)
        is_temp_session = True
    
    # Upload to storage
    storage_service = get_storage_service()
    # Use appropriate naming based on session type
    if is_temp_session:
        video_key = f"videos/temp/user_{current_user.id}/session_{session_id}_{video.filename}"
    else:
        video_key = f"videos/original/session_{session_id}_{video.filename}"
    
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
    
    # Update session if it exists in database
    if session:
        session.video_url = video_key
        session.processing_status = ProcessingStatus.PENDING
        
        # Create Video record in database
        from app.models.practice import Video
        video_record = Video(
            session_id=session_uuid,
            s3_key=video_key,
            duration_seconds=60,  # Default, will be updated during processing
            file_size_bytes=file_size,
            processed=False,
            upload_completed=True,
            upload_offset=file_size  # Set to file size since upload is complete
        )
        db.add(video_record)
        await db.commit()
        
        # Trigger processing task
        task = process_video.delay(
            str(session_uuid),  # Convert UUID to string for Celery
            video_key,
            current_user.id
        )
        task_id = task.id
    else:
        # For temporary sessions, we'll process later when session is synced
        task_id = None
    
    return VideoUploadResponse(
        session_id=0,  # Use 0 for all uploads since frontend uses non-UUID session IDs
        video_url=video_key,
        file_size=file_size,
        duration=0,  # Will be updated after processing
        processing_status=ProcessingStatus.PENDING,
        task_id=task_id
    )


def get_storage_service():
    """Get storage service instance."""
    return StorageService(
        bucket_name=settings.S3_BUCKET_NAME,
        endpoint_url=settings.S3_ENDPOINT_URL,
        access_key=settings.S3_ACCESS_KEY or settings.AWS_ACCESS_KEY_ID,
        secret_key=settings.S3_SECRET_KEY or settings.AWS_SECRET_ACCESS_KEY
    )


@router.post("/upload/{session_id}", response_model=VideoUploadResponse)
async def upload_video(
    session_id: int,
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload video for a practice session and trigger processing."""
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
    
    # Get practice session
    session = await db.get(PracticeSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Practice session not found")
    
    # Check authorization
    if session.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to upload video for this session")
    
    # Upload to storage
    storage_service = get_storage_service()
    video_key = f"videos/original/session_{session_id}_{video.filename}"
    
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
    
    # Update session
    session.video_url = video_key
    session.processing_status = ProcessingStatus.PENDING
    await db.commit()
    
    # Trigger processing task
    task = process_video.delay(
        session_id,
        video_key,
        current_user.id
    )
    
    return VideoUploadResponse(
        session_id=session_id,
        video_url=video_key,
        file_size=file_size,
        duration=0,  # Will be updated after processing
        processing_status=ProcessingStatus.PENDING,
        task_id=task.id
    )


@router.post("/process/{session_id}", response_model=VideoProcessingStatus)
async def trigger_processing(
    session_id: int,
    request: VideoProcessingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually trigger video processing for a session."""
    # Get practice session
    session = await db.get(PracticeSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Practice session not found")
    
    # Check authorization
    if session.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if video exists
    if not session.video_url:
        raise HTTPException(status_code=400, detail="No video uploaded for this session")
    
    # Check current status
    if session.processing_status == ProcessingStatus.PROCESSING:
        raise HTTPException(status_code=400, detail="Video is already being processed")
    
    # Update status
    session.processing_status = ProcessingStatus.PENDING
    await db.commit()
    
    # Trigger processing
    task = process_video.delay(
        session_id,
        session.video_url,
        current_user.id,
        [q.value for q in request.qualities]
    )
    
    return VideoProcessingStatus(
        session_id=session_id,
        status=ProcessingStatus.PENDING,
        progress=0,
        task_id=task.id
    )


@router.get("/{session_id}/status", response_model=VideoProcessingStatus)
async def get_processing_status(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get video processing status for a session."""
    # Get practice session
    session = await db.get(PracticeSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Practice session not found")
    
    # Check authorization
    if session.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return VideoProcessingStatus(
        session_id=session_id,
        status=session.processing_status or ProcessingStatus.PENDING,
        progress=session.processing_progress or 0,
        started_at=session.processing_started_at,
        completed_at=session.processing_completed_at,
        error_message=session.processing_error,
        result=session.processing_result
    )


@router.post("/{session_id}/download", response_model=VideoDownloadUrl)
async def get_download_url(
    session_id: int,
    quality: Optional[VideoQuality] = VideoQuality.MEDIUM,
    file_type: str = "video",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get presigned download URL for processed video."""
    # Get practice session
    session = await db.get(PracticeSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Practice session not found")
    
    # Check authorization
    if session.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if processing is complete
    if session.processing_status != ProcessingStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Video processing not completed")
    
    # Get file path from processing result
    if not session.processing_result:
        raise HTTPException(status_code=404, detail="Processing result not found")
    
    storage_service = get_storage_service()
    
    # Determine file path based on requested type
    if file_type == "video":
        videos = session.processing_result.get("transcoded_videos", {})
        video_info = videos.get(quality.value)
        if not video_info:
            raise HTTPException(status_code=404, detail=f"Video not found for quality: {quality}")
        file_path = video_info["path"]
    elif file_type == "audio":
        audio_info = session.processing_result.get("audio_track")
        if not audio_info:
            raise HTTPException(status_code=404, detail="Audio track not found")
        file_path = audio_info["path"]
    elif file_type == "preview":
        preview_info = session.processing_result.get("preview_clip")
        if not preview_info:
            raise HTTPException(status_code=404, detail="Preview clip not found")
        file_path = preview_info["path"]
    else:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    # Generate presigned URL
    presigned_url = await storage_service.generate_presigned_url(
        file_path,
        expiration=3600  # 1 hour
    )
    
    return VideoDownloadUrl(
        url=presigned_url,
        expires_in=3600,
        quality=quality if file_type == "video" else None,
        file_type=file_type
    )


@router.post("/batch/process", response_model=BatchProcessingResult)
async def process_batch(
    request: BatchProcessingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Process multiple videos in batch."""
    # Validate sessions
    sessions = []
    for session_id in request.session_ids:
        session = await db.get(PracticeSession, session_id)
        if not session:
            continue
        
        # Check authorization
        if session.student_id != current_user.id:
            continue
        
        # Check if video exists
        if session.video_url:
            sessions.append(session)
    
    if not sessions:
        raise HTTPException(status_code=400, detail="No valid sessions found for processing")
    
    # Trigger batch processing
    task = process_video_batch.delay(
        [s.id for s in sessions],
        [q.value for q in request.qualities]
    )
    
    result = task.get(timeout=5)  # Wait up to 5 seconds for initial response
    
    return BatchProcessingResult(
        total=len(request.session_ids),
        queued=result.get("queued", 0),
        processing=result.get("processing", 0),
        completed=result.get("completed", 0),
        failed=result.get("failed", 0),
        results=result
    )


@router.get("/{session_id}/thumbnails", response_model=List[VideoDownloadUrl])
async def get_thumbnails(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get thumbnail URLs for a processed video."""
    # Get practice session
    session = await db.get(PracticeSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Practice session not found")
    
    # Check authorization
    if session.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if processing is complete
    if session.processing_status != ProcessingStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Video processing not completed")
    
    # Get thumbnails from processing result
    if not session.processing_result:
        raise HTTPException(status_code=404, detail="Processing result not found")
    
    thumbnails = session.processing_result.get("thumbnails", [])
    if not thumbnails:
        raise HTTPException(status_code=404, detail="No thumbnails found")
    
    storage_service = get_storage_service()
    
    # Generate presigned URLs for thumbnails
    thumbnail_urls = []
    for thumb in thumbnails:
        presigned_url = await storage_service.generate_presigned_url(
            thumb["path"],
            expiration=3600
        )
        thumbnail_urls.append(
            VideoDownloadUrl(
                url=presigned_url,
                expires_in=3600,
                file_type="thumbnail"
            )
        )
    
    return thumbnail_urls