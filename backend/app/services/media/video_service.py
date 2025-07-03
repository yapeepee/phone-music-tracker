"""Video storage and management service"""
from typing import Optional, List, BinaryIO
from datetime import datetime, timedelta
from uuid import UUID
import json
import boto3
from botocore.exceptions import ClientError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.models.practice import Video, PracticeSession
from app.schemas.video import (
    VideoCreate, VideoUpdate, VideoUploadInit, 
    VideoUploadStatus, VideoWithPresignedUrl
)
from app.core.config import settings
from app.core.tus import generate_upload_id, calculate_expiry


class VideoService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self._s3_client = None
        self._bucket_name = settings.S3_BUCKET_NAME
    
    @property
    def s3_client(self):
        """Lazy initialization of S3 client"""
        if self._s3_client is None:
            self._s3_client = boto3.client(
                "s3",
                aws_access_key_id=settings.S3_ACCESS_KEY or settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.S3_SECRET_KEY or settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION,
                endpoint_url=settings.S3_ENDPOINT_URL  # For MinIO
            )
        return self._s3_client
    
    async def init_upload(
        self, 
        student_id: UUID,
        upload_data: VideoUploadInit
    ) -> tuple[Video, str]:
        """Initialize a new video upload"""
        # Verify session belongs to student
        session = await self.db.get(PracticeSession, upload_data.session_id)
        if not session or session.student_id != student_id:
            raise ValueError("Session not found or access denied")
        
        # Check if session already has a video
        existing = await self.db.execute(
            select(Video).where(Video.session_id == upload_data.session_id)
        )
        if existing.scalar_one_or_none():
            raise ValueError("Session already has a video")
        
        # Generate upload ID and S3 key
        upload_id = generate_upload_id(str(upload_data.session_id), upload_data.filename)
        s3_key = f"videos/{student_id}/{upload_data.session_id}/{upload_id}.mp4"
        
        # Create video record
        video = Video(
            session_id=upload_data.session_id,
            s3_key=s3_key,
            duration_seconds=upload_data.duration_seconds,
            file_size_bytes=upload_data.file_size,
            upload_id=upload_id,
            upload_offset=0,
            upload_completed=False,
            upload_metadata=json.dumps({
                "filename": upload_data.filename,
                "content_type": upload_data.content_type,
                "student_id": str(student_id)
            }),
            upload_expires_at=calculate_expiry(hours=24)
        )
        
        self.db.add(video)
        await self.db.commit()
        await self.db.refresh(video)
        
        # Initiate multipart upload in S3
        response = self.s3_client.create_multipart_upload(
            Bucket=self._bucket_name,
            Key=s3_key,
            ContentType=upload_data.content_type or "video/mp4",
            Metadata={
                "upload-id": upload_id,
                "session-id": str(upload_data.session_id),
                "student-id": str(student_id)
            }
        )
        
        # Store S3 upload ID in metadata
        metadata = json.loads(video.upload_metadata or "{}")
        metadata["s3_upload_id"] = response["UploadId"]
        video.upload_metadata = json.dumps(metadata)
        
        await self.db.commit()
        
        return video, response["UploadId"]
    
    async def get_upload_status(
        self, 
        upload_id: str,
        student_id: Optional[UUID] = None
    ) -> Optional[VideoUploadStatus]:
        """Get upload status"""
        query = select(Video).where(Video.upload_id == upload_id)
        
        if student_id:
            query = query.join(PracticeSession).where(
                PracticeSession.student_id == student_id
            )
        
        result = await self.db.execute(query)
        video = result.scalar_one_or_none()
        
        if not video:
            return None
        
        # Check if upload expired
        if video.upload_expires_at and video.upload_expires_at < datetime.utcnow():
            return None
        
        percentage = (video.upload_offset / video.file_size_bytes * 100) if video.file_size_bytes > 0 else 0
        
        return VideoUploadStatus(
            upload_id=upload_id,
            offset=video.upload_offset,
            size=video.file_size_bytes,
            completed=video.upload_completed,
            expires_at=video.upload_expires_at,
            percentage=round(percentage, 2)
        )
    
    async def update_upload_progress(
        self, 
        upload_id: str,
        offset: int,
        chunk_data: Optional[bytes] = None,
        part_number: Optional[int] = None
    ) -> Video:
        """Update upload progress"""
        # Get video record
        result = await self.db.execute(
            select(Video).where(Video.upload_id == upload_id).with_for_update()
        )
        video = result.scalar_one_or_none()
        
        if not video:
            raise ValueError("Upload not found")
        
        if video.upload_completed:
            raise ValueError("Upload already completed")
        
        if video.upload_expires_at and video.upload_expires_at < datetime.utcnow():
            raise ValueError("Upload expired")
        
        # Upload chunk to S3 if provided
        if chunk_data and part_number:
            metadata = json.loads(video.upload_metadata or "{}")
            s3_upload_id = metadata.get("s3_upload_id")
            
            if not s3_upload_id:
                raise ValueError("S3 upload ID not found")
            
            response = self.s3_client.upload_part(
                Bucket=self._bucket_name,
                Key=video.s3_key,
                PartNumber=part_number,
                UploadId=s3_upload_id,
                Body=chunk_data
            )
            
            # Store ETag for part
            parts = metadata.get("parts", [])
            parts.append({
                "PartNumber": part_number,
                "ETag": response["ETag"]
            })
            metadata["parts"] = parts
            video.upload_metadata = json.dumps(metadata)
        
        # Update offset
        video.upload_offset = offset
        
        # Check if upload is complete
        if offset >= video.file_size_bytes:
            video.upload_completed = True
            video.upload_expires_at = None
        
        await self.db.commit()
        await self.db.refresh(video)
        
        return video
    
    async def complete_upload(
        self, 
        upload_id: str,
        student_id: UUID
    ) -> Video:
        """Complete the upload and finalize S3 multipart upload"""
        # Get video with session info
        result = await self.db.execute(
            select(Video).where(Video.upload_id == upload_id)
            .options(selectinload(Video.session))
        )
        video = result.scalar_one_or_none()
        
        if not video:
            raise ValueError("Upload not found")
        
        if video.session.student_id != student_id:
            raise ValueError("Access denied")
        
        if not video.upload_completed:
            raise ValueError("Upload not completed")
        
        # Complete S3 multipart upload
        metadata = json.loads(video.upload_metadata or "{}")
        s3_upload_id = metadata.get("s3_upload_id")
        parts = metadata.get("parts", [])
        
        if s3_upload_id and parts:
            self.s3_client.complete_multipart_upload(
                Bucket=self._bucket_name,
                Key=video.s3_key,
                UploadId=s3_upload_id,
                MultipartUpload={"Parts": sorted(parts, key=lambda x: x["PartNumber"])}
            )
        
        # Clear upload metadata
        video.upload_metadata = None
        video.upload_expires_at = None
        
        await self.db.commit()
        await self.db.refresh(video)
        
        return video
    
    async def abort_upload(
        self, 
        upload_id: str,
        student_id: UUID
    ) -> bool:
        """Abort an upload and clean up resources"""
        # Get video with session info
        result = await self.db.execute(
            select(Video).where(Video.upload_id == upload_id)
            .options(selectinload(Video.session))
        )
        video = result.scalar_one_or_none()
        
        if not video:
            return False
        
        if video.session.student_id != student_id:
            raise ValueError("Access denied")
        
        # Abort S3 multipart upload
        metadata = json.loads(video.upload_metadata or "{}")
        s3_upload_id = metadata.get("s3_upload_id")
        
        if s3_upload_id:
            try:
                self.s3_client.abort_multipart_upload(
                    Bucket=self._bucket_name,
                    Key=video.s3_key,
                    UploadId=s3_upload_id
                )
            except ClientError:
                pass  # Upload might not exist
        
        # Delete video record
        await self.db.delete(video)
        await self.db.commit()
        
        return True
    
    async def get_video_by_id(
        self, 
        video_id: UUID,
        student_id: Optional[UUID] = None
    ) -> Optional[Video]:
        """Get video by ID"""
        query = select(Video).where(Video.id == video_id)
        
        if student_id:
            query = query.join(PracticeSession).where(
                PracticeSession.student_id == student_id
            )
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_video_with_url(
        self, 
        video_id: UUID,
        student_id: Optional[UUID] = None,
        expires_in: int = 3600
    ) -> Optional[VideoWithPresignedUrl]:
        """Get video with presigned URL for playback"""
        video = await self.get_video_by_id(video_id, student_id)
        
        if not video or not video.upload_completed:
            return None
        
        # Generate presigned URL
        presigned_url = self.s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self._bucket_name, "Key": video.s3_key},
            ExpiresIn=expires_in
        )
        
        # Replace internal MinIO URL with external URL for client access
        # The presigned URL contains the internal Docker hostname which is not accessible externally
        if presigned_url and "minio:9000" in presigned_url:
            # Get external URL from environment or use localhost as fallback
            import os
            external_url = os.getenv("S3_EXTERNAL_URL", "http://localhost:9000")
            presigned_url = presigned_url.replace("http://minio:9000", external_url)
        
        # Generate thumbnail URL if available
        thumbnail_url = None
        if video.thumbnail_s3_key:
            thumbnail_url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self._bucket_name, "Key": video.thumbnail_s3_key},
                ExpiresIn=expires_in
            )
            # Replace internal URL for thumbnail too
            if thumbnail_url and "minio:9000" in thumbnail_url:
                external_url = os.getenv("S3_EXTERNAL_URL", "http://localhost:9000")
                thumbnail_url = thumbnail_url.replace("http://minio:9000", external_url)
        
        return VideoWithPresignedUrl(
            **video.__dict__,
            url=presigned_url,  # Changed from presigned_url to match frontend expectation
            thumbnail_url=thumbnail_url
        )
    
    async def get_session_videos(
        self, 
        session_id: UUID,
        student_id: Optional[UUID] = None
    ) -> List[Video]:
        """Get all videos for a session"""
        query = select(Video).where(
            Video.session_id == session_id,
            Video.upload_completed == True
        )
        
        if student_id:
            query = query.join(PracticeSession).where(
                PracticeSession.student_id == student_id
            )
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def delete_video(
        self, 
        video_id: UUID,
        student_id: UUID
    ) -> bool:
        """Delete a video"""
        # Get video with session info
        result = await self.db.execute(
            select(Video).where(Video.id == video_id)
            .options(selectinload(Video.session))
        )
        video = result.scalar_one_or_none()
        
        if not video:
            return False
        
        if video.session.student_id != student_id:
            raise ValueError("Access denied")
        
        # Delete from S3
        try:
            self.s3_client.delete_object(Bucket=self._bucket_name, Key=video.s3_key)
            
            if video.thumbnail_s3_key:
                self.s3_client.delete_object(
                    Bucket=self._bucket_name, 
                    Key=video.thumbnail_s3_key
                )
        except ClientError:
            pass  # Object might not exist
        
        # Delete from database
        await self.db.delete(video)
        await self.db.commit()
        
        return True
    
    async def generate_upload_url(
        self, 
        key: str,
        expires_in: int = 3600
    ) -> str:
        """Generate presigned URL for direct upload"""
        return self.s3_client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": self._bucket_name,
                "Key": key,
                "ContentType": "video/mp4"
            },
            ExpiresIn=expires_in
        )
    
    async def cleanup_expired_uploads(self) -> int:
        """Clean up expired uploads"""
        # Find expired uploads
        result = await self.db.execute(
            select(Video).where(
                Video.upload_completed == False,
                Video.upload_expires_at < datetime.utcnow()
            )
        )
        expired_videos = result.scalars().all()
        
        count = 0
        for video in expired_videos:
            # Abort S3 upload
            metadata = json.loads(video.upload_metadata or "{}")
            s3_upload_id = metadata.get("s3_upload_id")
            
            if s3_upload_id:
                try:
                    self.s3_client.abort_multipart_upload(
                        Bucket=self._bucket_name,
                        Key=video.s3_key,
                        UploadId=s3_upload_id
                    )
                except ClientError:
                    pass
            
            # Delete record
            await self.db.delete(video)
            count += 1
        
        await self.db.commit()
        return count