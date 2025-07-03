"""Celery tasks for video processing."""
import os
import tempfile
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union
from pathlib import Path
import asyncio
import uuid

from celery import Task
from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.core.database import get_db_sync
from app.core.config import settings
from app.services.media.video_processor import VideoProcessor
from app.services.storage import StorageService
from app.services.analytics import AudioAnalysisService
from app.models.practice import PracticeSession, VideoQuality, ProcessingStatus
from app.models.notification import Notification, NotificationType
from app.models.analytics import PracticeMetrics, AnalysisResult, MetricType
from app.schemas.video_processing import (
    VideoProcessingResult,
    ProcessingProgress,
    ThumbnailInfo
)

logger = logging.getLogger(__name__)


class CallbackTask(Task):
    """Base task with callbacks."""
    
    def on_success(self, retval, task_id, args, kwargs):
        """Success callback."""
        logger.info(f"Task {task_id} succeeded with result: {retval}")
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Failure callback."""
        logger.error(f"Task {task_id} failed with exception: {exc}")


def get_storage_service():
    """Get storage service instance."""
    return StorageService(
        bucket_name=settings.S3_BUCKET_NAME,
        endpoint_url=settings.S3_ENDPOINT_URL,
        access_key=settings.S3_ACCESS_KEY,
        secret_key=settings.S3_SECRET_KEY
    )


async def update_processing_status(
    session_id: Union[str, uuid.UUID],
    status: ProcessingStatus,
    progress: Optional[float] = None,
    error_message: Optional[str] = None,
    result: Optional[Dict] = None
):
    """Update practice session processing status."""
    # Skip database updates for non-UUID session IDs (temporary sessions)
    try:
        # Try to parse as UUID
        if isinstance(session_id, str):
            session_uuid = uuid.UUID(session_id)
        else:
            session_uuid = session_id
    except ValueError:
        # Not a valid UUID, skip database update
        logger.info(f"Skipping DB update for temporary session: {session_id}")
        return
    
    db = next(get_db_sync())
    try:
        session = db.query(PracticeSession).filter(
            PracticeSession.id == session_uuid
        ).first()
        
        if session:
            session.processing_status = status
            if progress is not None:
                session.processing_progress = progress
            if error_message:
                session.processing_error = error_message
            if result:
                session.processing_result = result
            
            db.commit()
    finally:
        db.close()


async def send_processing_notification(
    user_id: Union[str, uuid.UUID],
    session_id: Union[str, uuid.UUID],
    status: ProcessingStatus,
    message: str
):
    """Send notification about processing status."""
    # Skip notifications for temporary sessions
    try:
        if isinstance(session_id, str):
            session_uuid = uuid.UUID(session_id)  # Validate it's a UUID
        else:
            session_uuid = session_id
    except ValueError:
        logger.info(f"Skipping notification for temporary session: {session_id}")
        return
    
    db = next(get_db_sync())
    try:
        # Convert string UUID to UUID object if needed
        if isinstance(user_id, str):
            user_id_uuid = uuid.UUID(user_id)
        else:
            user_id_uuid = user_id
        
        notification = Notification(
            user_id=user_id_uuid,
            type=NotificationType.VIDEO_PROCESSING,
            title="Video Processing Update",
            message=message,
            data={
                "session_id": str(session_uuid),
                "status": status.value
            }
        )
        db.add(notification)
        db.commit()
    finally:
        db.close()


@celery_app.task(base=CallbackTask, bind=True, max_retries=3)
def process_video(
    self,
    session_id: Union[str, uuid.UUID],
    video_path: str,
    user_id: Union[str, uuid.UUID],
    qualities: List[str] = None
) -> Dict:
    """
    Main video processing task.
    
    Args:
        session_id: Practice session ID
        video_path: Path to original video in storage
        user_id: User ID for notifications
        qualities: List of quality levels to generate
    
    Returns:
        Processing result dictionary
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        # Default qualities if not specified
        if not qualities:
            qualities = ["low", "medium", "high"]
        
        # Update status to processing
        loop.run_until_complete(
            update_processing_status(session_id, ProcessingStatus.PROCESSING, 0.1)
        )
        
        # Initialize services
        storage_service = get_storage_service()
        video_processor = VideoProcessor(storage_service)
        
        # Download original video to temp
        temp_dir = Path(tempfile.mkdtemp())
        original_path = temp_dir / "original.mp4"
        
        logger.info(f"Downloading video from {video_path}")
        loop.run_until_complete(
            storage_service.download_file(video_path, str(original_path))
        )
        
        # Get video info
        video_info = loop.run_until_complete(
            video_processor.get_video_info(str(original_path))
        )
        
        results = {
            "video_info": video_info,
            "transcoded_videos": {},
            "thumbnails": [],
            "audio_track": None,
            "preview_clip": None,
            "audio_analysis": None
        }
        
        # Progress tracking
        total_steps = len(qualities) + 4  # qualities + thumbnails + audio + analysis + preview
        current_step = 0
        
        async def update_progress(progress: float):
            """Update task progress."""
            overall_progress = (current_step + progress) / total_steps
            await update_processing_status(
                session_id,
                ProcessingStatus.PROCESSING,
                overall_progress
            )
        
        # Process each quality level
        for quality in qualities:
            current_step += 1
            quality_enum = VideoQuality(quality)
            
            output_filename = f"session_{session_id}_{quality}.mp4"
            output_path = temp_dir / output_filename
            
            logger.info(f"Transcoding to {quality} quality")
            loop.run_until_complete(
                video_processor.transcode_video(
                    str(original_path),
                    str(output_path),
                    quality_enum,
                    update_progress
                )
            )
            
            # Upload to storage
            storage_key = f"videos/sessions/{session_id}/{output_filename}"
            loop.run_until_complete(
                storage_service.upload_file(str(output_path), storage_key)
            )
            
            results["transcoded_videos"][quality] = {
                "path": storage_key,
                "size": output_path.stat().st_size,
                "quality": quality
            }
        
        # Generate thumbnails
        current_step += 1
        logger.info("Generating thumbnails")
        thumbnail_paths = loop.run_until_complete(
            video_processor.generate_thumbnails(str(original_path), count=5)
        )
        
        for i, thumb_path in enumerate(thumbnail_paths):
            thumb_key = f"videos/sessions/{session_id}/thumb_{i}.jpg"
            loop.run_until_complete(
                storage_service.upload_file(thumb_path, thumb_key)
            )
            results["thumbnails"].append({
                "path": thumb_key,
                "index": i
            })
        
        # Extract audio
        current_step += 1
        logger.info("Extracting audio track")
        audio_path = temp_dir / f"session_{session_id}_audio.mp3"
        loop.run_until_complete(
            video_processor.extract_audio(
                str(original_path),
                str(audio_path)
            )
        )
        
        audio_key = f"videos/sessions/{session_id}/audio.mp3"
        loop.run_until_complete(
            storage_service.upload_file(str(audio_path), audio_key)
        )
        results["audio_track"] = {
            "path": audio_key,
            "format": "mp3",
            "bitrate": "192k"
        }
        
        # Perform audio analysis
        current_step += 1
        logger.info("Analyzing audio for practice metrics")
        try:
            audio_analysis_service = AudioAnalysisService()
            analysis_results = loop.run_until_complete(
                audio_analysis_service.analyze_audio_file(str(audio_path))
            )
            
            # Store analysis results
            results["audio_analysis"] = analysis_results
            
            # Save analysis to database
            db = next(get_db_sync())
            try:
                # Convert session_id to UUID if it's a string
                if isinstance(session_id, str):
                    session_uuid = uuid.UUID(session_id)
                else:
                    session_uuid = session_id
                    
                # Create analysis result record
                analysis_record = AnalysisResult(
                    session_id=session_uuid,
                    overall_consistency_score=analysis_results["overall_metrics"]["overall_consistency"],
                    tempo_score=analysis_results["overall_metrics"]["tempo_score"],
                    pitch_score=analysis_results["overall_metrics"]["pitch_score"],
                    dynamics_score=analysis_results["overall_metrics"]["dynamics_score"],
                    vibrato_score=analysis_results["overall_metrics"]["vibrato_score"],
                    technical_proficiency_score=analysis_results["overall_metrics"]["technical_proficiency"],
                    musical_expression_score=analysis_results["overall_metrics"]["musical_expression"],
                    average_tempo_bpm=analysis_results["tempo"]["bpm"],
                    tempo_stability=analysis_results["tempo"]["tempo_stability"],
                    pitch_range_min_hz=analysis_results["pitch"]["pitch_range"]["min_hz"],
                    pitch_range_max_hz=analysis_results["pitch"]["pitch_range"]["max_hz"],
                    pitch_stability=analysis_results["pitch"]["pitch_stability"],
                    dynamic_range_db=analysis_results["dynamics"]["dynamic_range_db"],
                    dynamics_stability=analysis_results["dynamics"]["dynamics_stability"],
                    vibrato_rate_hz=analysis_results["vibrato"]["average_rate_hz"],
                    vibrato_extent_percent=analysis_results["vibrato"]["average_extent_percent"],
                    note_onset_count=analysis_results["note_onsets"]["onset_count"],
                    timing_consistency=analysis_results["note_onsets"]["timing_consistency"],
                    full_analysis_data=analysis_results,
                    processing_time_seconds=analysis_results.get("duration", 0)
                )
                db.add(analysis_record)
                
                # Store time-series metrics
                # Use bulk insert to avoid TimescaleDB composite key issues
                metrics_to_insert = []
                base_time = datetime.utcnow()
                
                # Tempo variations over time
                for i, tempo in enumerate(analysis_results["tempo"]["tempo_variations"]):
                    time_offset = i * (analysis_results["duration"] / len(analysis_results["tempo"]["tempo_variations"]))
                    metrics_to_insert.append({
                        "time": base_time + timedelta(seconds=time_offset),
                        "session_id": session_uuid,
                        "metric_type": MetricType.TEMPO_BPM,
                        "value": tempo
                    })
                
                # Store sample of pitch values
                pitch_values = analysis_results["pitch"]["pitch_values"][:100]  # Limit to 100 samples
                for i, pitch in enumerate(pitch_values):
                    time_offset = i * (analysis_results["duration"] / len(pitch_values))
                    metrics_to_insert.append({
                        "time": base_time + timedelta(seconds=time_offset),
                        "session_id": session_uuid,
                        "metric_type": MetricType.PITCH_HZ,
                        "value": pitch,
                        "confidence": analysis_results["pitch"]["pitch_confidences"][i] if i < len(analysis_results["pitch"]["pitch_confidences"]) else None
                    })
                
                # Store dynamics values
                db_values = analysis_results["dynamics"]["db_values"][:100]  # Limit to 100 samples
                for i, db_val in enumerate(db_values):
                    time_offset = i * (analysis_results["duration"] / len(db_values))
                    metrics_to_insert.append({
                        "time": base_time + timedelta(seconds=time_offset),
                        "session_id": session_uuid,
                        "metric_type": MetricType.DYNAMICS_DB,
                        "value": db_val
                    })
                
                # Bulk insert all metrics to avoid composite key issues
                if metrics_to_insert:
                    db.bulk_insert_mappings(PracticeMetrics, metrics_to_insert)
                
                db.commit()
                logger.info(f"Audio analysis completed and saved for session {session_id}")
                
                # Track challenge progress with analysis results
                try:
                    # Get the practice session
                    from app.models.practice import PracticeSession
                    session = db.query(PracticeSession).filter(PracticeSession.id == session_uuid).first()
                    
                    if session:
                        # Convert to async session for challenge service
                        from app.db.session import AsyncSessionLocal
                        async_db = AsyncSessionLocal()
                        try:
                            from app.services.practice.challenge_service import ChallengeService
                            challenge_service = ChallengeService(async_db)
                            
                            # Run async code in sync context
                            import asyncio
                            loop = asyncio.new_event_loop()
                            asyncio.set_event_loop(loop)
                            
                            # Track with analysis results
                            loop.run_until_complete(
                                challenge_service.track_practice_session(session, analysis_record)
                            )
                            loop.run_until_complete(async_db.commit())
                            
                            logger.info(f"Challenge progress tracked for session {session_id}")
                        finally:
                            loop.run_until_complete(async_db.close())
                except Exception as e:
                    logger.error(f"Error tracking challenge progress: {str(e)}")
                    # Don't fail the task if challenge tracking fails
                    
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Audio analysis failed: {e}")
            results["audio_analysis"] = {"error": str(e)}
        
        # Create preview clip
        current_step += 1
        logger.info("Creating preview clip")
        preview_path = temp_dir / f"session_{session_id}_preview.mp4"
        
        # Start preview at 10% of video duration
        start_time = video_info["duration"] * 0.1
        loop.run_until_complete(
            video_processor.create_preview_clip(
                str(original_path),
                str(preview_path),
                start_time,
                duration=30
            )
        )
        
        preview_key = f"videos/sessions/{session_id}/preview.mp4"
        loop.run_until_complete(
            storage_service.upload_file(str(preview_path), preview_key)
        )
        results["preview_clip"] = {
            "path": preview_key,
            "duration": 30,
            "start_time": start_time
        }
        
        # Update status to completed
        loop.run_until_complete(
            update_processing_status(
                session_id,
                ProcessingStatus.COMPLETED,
                1.0,
                result=results
            )
        )
        
        # Send completion notification
        loop.run_until_complete(
            send_processing_notification(
                user_id,
                session_id,
                ProcessingStatus.COMPLETED,
                "Your video has been processed successfully!"
            )
        )
        
        # Cleanup temp files
        video_processor.cleanup_temp_files(
            [str(original_path), str(audio_path), str(preview_path)] +
            thumbnail_paths +
            [str(temp_dir / f) for f in os.listdir(temp_dir)]
        )
        
        return results
        
    except Exception as e:
        logger.error(f"Video processing failed: {e}")
        
        # Update status to failed
        loop.run_until_complete(
            update_processing_status(
                session_id,
                ProcessingStatus.FAILED,
                error_message=str(e)
            )
        )
        
        # Send failure notification
        loop.run_until_complete(
            send_processing_notification(
                user_id,
                session_id,
                ProcessingStatus.FAILED,
                f"Video processing failed: {str(e)}"
            )
        )
        
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
    
    finally:
        loop.close()


@celery_app.task
def generate_thumbnail(
    session_id: Union[str, uuid.UUID],
    video_path: str,
    timestamp: float,
    width: int = 320,
    height: int = 180
) -> Dict:
    """
    Generate a single thumbnail at specific timestamp.
    
    Args:
        session_id: Practice session ID
        video_path: Path to video in storage
        timestamp: Timestamp in seconds
        width: Thumbnail width
        height: Thumbnail height
    
    Returns:
        Thumbnail information
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        storage_service = get_storage_service()
        video_processor = VideoProcessor(storage_service)
        
        # Download video
        temp_dir = Path(tempfile.mkdtemp())
        video_local_path = temp_dir / "video.mp4"
        
        loop.run_until_complete(
            storage_service.download_file(video_path, str(video_local_path))
        )
        
        # Generate thumbnail
        thumb_path = temp_dir / f"thumb_{timestamp}.jpg"
        loop.run_until_complete(
            video_processor.generate_thumbnail(
                str(video_local_path),
                str(thumb_path),
                timestamp,
                width,
                height
            )
        )
        
        # Upload thumbnail
        thumb_key = f"videos/sessions/{session_id}/thumb_custom_{timestamp}.jpg"
        loop.run_until_complete(
            storage_service.upload_file(str(thumb_path), thumb_key)
        )
        
        # Cleanup
        video_processor.cleanup_temp_files([str(video_local_path), str(thumb_path)])
        
        return {
            "path": thumb_key,
            "timestamp": timestamp,
            "width": width,
            "height": height
        }
        
    finally:
        loop.close()


@celery_app.task
def extract_audio(
    session_id: Union[str, uuid.UUID],
    video_path: str,
    format: str = "mp3",
    bitrate: str = "192k"
) -> Dict:
    """
    Extract audio track from video.
    
    Args:
        session_id: Practice session ID
        video_path: Path to video in storage
        format: Audio format (mp3, aac, wav)
        bitrate: Audio bitrate
    
    Returns:
        Audio track information
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        storage_service = get_storage_service()
        video_processor = VideoProcessor(storage_service)
        
        # Download video
        temp_dir = Path(tempfile.mkdtemp())
        video_local_path = temp_dir / "video.mp4"
        
        loop.run_until_complete(
            storage_service.download_file(video_path, str(video_local_path))
        )
        
        # Extract audio
        audio_path = temp_dir / f"audio.{format}"
        loop.run_until_complete(
            video_processor.extract_audio(
                str(video_local_path),
                str(audio_path),
                format,
                bitrate
            )
        )
        
        # Upload audio
        audio_key = f"videos/sessions/{session_id}/audio_extracted.{format}"
        loop.run_until_complete(
            storage_service.upload_file(str(audio_path), audio_key)
        )
        
        # Cleanup
        video_processor.cleanup_temp_files([str(video_local_path), str(audio_path)])
        
        return {
            "path": audio_key,
            "format": format,
            "bitrate": bitrate,
            "size": audio_path.stat().st_size
        }
        
    finally:
        loop.close()


@celery_app.task
def cleanup_expired_videos():
    """
    Cleanup expired video files and database entries.
    Runs periodically to remove old processed videos.
    """
    db = next(get_db_sync())
    try:
        # Find sessions older than retention period
        retention_days = settings.VIDEO_RETENTION_DAYS
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        expired_sessions = db.query(PracticeSession).filter(
            PracticeSession.created_at < cutoff_date,
            PracticeSession.video_url.isnot(None)
        ).all()
        
        storage_service = get_storage_service()
        
        for session in expired_sessions:
            try:
                # Delete video files from storage
                if session.processing_result:
                    # Delete transcoded videos
                    for quality, info in session.processing_result.get("transcoded_videos", {}).items():
                        asyncio.run(
                            storage_service.delete_file(info["path"])
                        )
                    
                    # Delete thumbnails
                    for thumb in session.processing_result.get("thumbnails", []):
                        asyncio.run(
                            storage_service.delete_file(thumb["path"])
                        )
                    
                    # Delete audio
                    if session.processing_result.get("audio_track"):
                        asyncio.run(
                            storage_service.delete_file(
                                session.processing_result["audio_track"]["path"]
                            )
                        )
                    
                    # Delete preview
                    if session.processing_result.get("preview_clip"):
                        asyncio.run(
                            storage_service.delete_file(
                                session.processing_result["preview_clip"]["path"]
                            )
                        )
                
                # Delete original video
                if session.video_url:
                    asyncio.run(
                        storage_service.delete_file(session.video_url)
                    )
                
                # Clear video data from database
                session.video_url = None
                session.processing_result = None
                session.processing_status = None
                
                logger.info(f"Cleaned up video files for session {session.id}")
                
            except Exception as e:
                logger.error(f"Error cleaning up session {session.id}: {e}")
        
        db.commit()
        
        return {
            "cleaned_sessions": len(expired_sessions),
            "cutoff_date": cutoff_date.isoformat()
        }
        
    finally:
        db.close()


@celery_app.task
def process_video_batch(session_ids: List[Union[str, uuid.UUID]], qualities: Optional[List[str]] = None):
    """
    Process multiple videos in batch.
    
    Args:
        session_ids: List of practice session IDs
        qualities: Quality levels to generate
    
    Returns:
        Batch processing results
    """
    results = {}
    
    for session_id in session_ids:
        try:
            # Get session details
            db = next(get_db_sync())
            session = db.query(PracticeSession).filter(
                PracticeSession.id == session_id
            ).first()
            db.close()
            
            if session and session.video_url:
                # Queue individual processing task
                task = process_video.delay(
                    session_id,
                    session.video_url,
                    session.user_id,
                    qualities
                )
                results[session_id] = {
                    "task_id": task.id,
                    "status": "queued"
                }
            else:
                results[session_id] = {
                    "status": "skipped",
                    "reason": "No video found"
                }
                
        except Exception as e:
            results[session_id] = {
                "status": "error",
                "error": str(e)
            }
    
    return results