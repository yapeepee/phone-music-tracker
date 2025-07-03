"""Video upload API endpoints with TUS protocol support"""
from typing import List, Optional, Annotated
from uuid import UUID
from fastapi import (
    APIRouter, Depends, HTTPException, status, 
    Request, Response, Body, Path, Query
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json

from app.db.session import get_db
from app.api.deps import get_current_active_user, get_current_student
from app.models.user import User
from app.services.media.video_service import VideoService
from app.schemas.video import (
    VideoUploadInit, VideoUploadResponse, VideoUploadStatus,
    VideoUploadComplete, Video, VideoWithPresignedUrl
)
from app.core.tus import (
    TusResponse, TusValidator, TusMetadata,
    parse_checksum_header, verify_chunk_checksum
)
from app.core.config import settings


router = APIRouter()


# Standard REST endpoints

@router.post("/upload/init", response_model=VideoUploadResponse)
async def init_video_upload(
    upload_data: VideoUploadInit,
    current_user: Annotated[User, Depends(get_current_student)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> VideoUploadResponse:
    """Initialize a video upload for a practice session"""
    service = VideoService(db)
    
    try:
        video, s3_upload_id = await service.init_upload(
            student_id=current_user.id,
            upload_data=upload_data
        )
        
        # Generate upload URL
        upload_url = f"{settings.API_V1_STR}/videos/tus/{video.upload_id}"
        
        return VideoUploadResponse(
            upload_id=video.upload_id,
            upload_url=upload_url,
            expires_at=video.upload_expires_at,
            chunk_size=5242880  # 5MB
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/upload/{upload_id}/status", response_model=VideoUploadStatus)
async def get_upload_status(
    upload_id: str,
    current_user: Annotated[User, Depends(get_current_student)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> VideoUploadStatus:
    """Get upload status"""
    service = VideoService(db)
    
    upload_status = await service.get_upload_status(
        upload_id=upload_id,
        student_id=current_user.id
    )
    
    if not upload_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload not found or expired"
        )
    
    return upload_status


@router.post("/upload/complete", response_model=Video)
async def complete_upload(
    complete_data: VideoUploadComplete,
    current_user: Annotated[User, Depends(get_current_student)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Video:
    """Complete the upload"""
    service = VideoService(db)
    
    try:
        video = await service.complete_upload(
            upload_id=complete_data.upload_id,
            student_id=current_user.id
        )
        return Video.model_validate(video)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/upload/{upload_id}")
async def abort_upload(
    upload_id: str,
    current_user: Annotated[User, Depends(get_current_student)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Response:
    """Abort an upload"""
    service = VideoService(db)
    
    try:
        deleted = await service.abort_upload(
            upload_id=upload_id,
            student_id=current_user.id
        )
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Upload not found"
            )
        
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )


@router.get("/{video_id}", response_model=VideoWithPresignedUrl)
async def get_video(
    video_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> VideoWithPresignedUrl:
    """Get video with presigned URL"""
    service = VideoService(db)
    
    # Students can only see their own videos
    student_id = current_user.id if current_user.role == "student" else None
    
    video = await service.get_video_with_url(
        video_id=video_id,
        student_id=student_id
    )
    
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found"
        )
    
    return video


@router.get("/session/{session_id}", response_model=List[Video])
async def get_session_videos(
    session_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> List[Video]:
    """Get all videos for a session"""
    service = VideoService(db)
    
    # Students can only see their own videos
    student_id = current_user.id if current_user.role == "student" else None
    
    videos = await service.get_session_videos(
        session_id=session_id,
        student_id=student_id
    )
    
    return [Video.model_validate(v) for v in videos]


@router.delete("/{video_id}")
async def delete_video(
    video_id: UUID,
    current_user: Annotated[User, Depends(get_current_student)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Response:
    """Delete a video"""
    service = VideoService(db)
    
    try:
        deleted = await service.delete_video(
            video_id=video_id,
            student_id=current_user.id
        )
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video not found"
            )
        
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )


# TUS Protocol endpoints

@router.options("/tus")
@router.options("/tus/{upload_id}")
async def tus_options(upload_id: Optional[str] = None) -> Response:
    """Handle TUS OPTIONS request"""
    return TusResponse.options(max_size=settings.MAX_VIDEO_SIZE_MB * 1024 * 1024)


@router.post("/tus")
async def tus_create(
    request: Request,
    current_user: Annotated[User, Depends(get_current_student)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Response:
    """Handle TUS POST request for creating upload"""
    # Validate TUS version
    TusValidator.validate_version(request)
    
    # Get upload length
    upload_length = TusValidator.get_upload_length(request)
    if not upload_length:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Upload-Length header is required"
        )
    
    # Parse metadata
    metadata_header = request.headers.get("Upload-Metadata", "")
    metadata = TusMetadata.from_header(metadata_header)
    
    if not metadata.session_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="session_id is required in metadata"
        )
    
    # Create upload
    service = VideoService(db)
    
    try:
        upload_data = VideoUploadInit(
            session_id=UUID(metadata.session_id),
            filename=metadata.filename,
            file_size=upload_length,
            duration_seconds=metadata.duration or 60,
            content_type=metadata.filetype
        )
        
        video, _ = await service.init_upload(
            student_id=current_user.id,
            upload_data=upload_data
        )
        
        # Return TUS response
        location = f"{request.url.scheme}://{request.url.netloc}{settings.API_V1_STR}/videos/tus/{video.upload_id}"
        
        # Handle creation-with-upload
        if request.headers.get("Content-Type", "").startswith("application/offset+octet-stream"):
            # Process initial chunk
            chunk_data = await request.body()
            if chunk_data:
                part_number = 1
                video = await service.update_upload_progress(
                    upload_id=video.upload_id,
                    offset=len(chunk_data),
                    chunk_data=chunk_data,
                    part_number=part_number
                )
                return TusResponse.created(location, video.upload_offset)
        
        return TusResponse.created(location)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.head("/tus/{upload_id}")
async def tus_head(
    upload_id: str,
    current_user: Annotated[User, Depends(get_current_student)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Response:
    """Handle TUS HEAD request"""
    service = VideoService(db)
    
    upload_status = await service.get_upload_status(
        upload_id=upload_id,
        student_id=current_user.id
    )
    
    if not upload_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload not found or expired"
        )
    
    # Get metadata
    from app.models.practice import Video
    result = await db.execute(
        select(Video).where(Video.upload_id == upload_id)
    )
    video = result.scalar_one_or_none()
    
    metadata = None
    if video and video.upload_metadata:
        metadata_dict = json.loads(video.upload_metadata)
        tus_metadata = TusMetadata(
            filename=metadata_dict.get("filename", ""),
            filetype=metadata_dict.get("content_type"),
            session_id=str(video.session_id),
            duration=video.duration_seconds,
            size=video.file_size_bytes
        )
        metadata = tus_metadata.to_header()
    
    return TusResponse.head(
        offset=upload_status.offset,
        length=upload_status.size,
        metadata=metadata
    )


@router.patch("/tus/{upload_id}")
async def tus_patch(
    upload_id: str,
    request: Request,
    current_user: Annotated[User, Depends(get_current_student)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Response:
    """Handle TUS PATCH request for uploading chunks"""
    # Validate TUS version
    TusValidator.validate_version(request)
    
    # Validate content type
    TusValidator.validate_content_type(request)
    
    service = VideoService(db)
    
    # Get current upload status
    upload_status = await service.get_upload_status(
        upload_id=upload_id,
        student_id=current_user.id
    )
    
    if not upload_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload not found or expired"
        )
    
    if upload_status.completed:
        return TusResponse.patch_success(upload_status.size)
    
    # Validate offset
    expected_offset = upload_status.offset
    TusValidator.validate_offset(request, expected_offset)
    
    # Read chunk data
    chunk_data = await request.body()
    chunk_size = len(chunk_data)
    
    if chunk_size == 0:
        return TusResponse.patch_success(expected_offset)
    
    # Verify checksum if provided
    checksum_header = request.headers.get("Upload-Checksum")
    if checksum_header:
        checksum_info = parse_checksum_header(checksum_header)
        if checksum_info:
            algorithm, expected_checksum = checksum_info
            if not verify_chunk_checksum(chunk_data, algorithm, expected_checksum):
                raise HTTPException(
                    status_code=460,  # Custom status code for checksum mismatch
                    detail="Checksum mismatch"
                )
    
    # Calculate part number (5MB parts)
    part_size = 5 * 1024 * 1024
    part_number = (expected_offset // part_size) + 1
    
    # Update upload progress
    try:
        video = await service.update_upload_progress(
            upload_id=upload_id,
            offset=expected_offset + chunk_size,
            chunk_data=chunk_data,
            part_number=part_number
        )
        
        # If upload is complete, finalize it
        if video.upload_completed:
            await service.complete_upload(upload_id, current_user.id)
        
        return TusResponse.patch_success(video.upload_offset)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/tus/{upload_id}")
async def tus_delete(
    upload_id: str,
    current_user: Annotated[User, Depends(get_current_student)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Response:
    """Handle TUS DELETE request"""
    service = VideoService(db)
    
    try:
        deleted = await service.abort_upload(
            upload_id=upload_id,
            student_id=current_user.id
        )
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Upload not found"
            )
        
        return Response(
            status_code=status.HTTP_204_NO_CONTENT,
            headers={"Tus-Resumable": "1.0.0"}
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )