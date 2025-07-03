"""Video processing service using FFmpeg."""
import os
import tempfile
import logging
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import ffmpeg
from PIL import Image
import boto3
from botocore.exceptions import ClientError

from app.core.config import settings
from app.services.storage import StorageService
from app.models.practice import VideoQuality

logger = logging.getLogger(__name__)


class VideoProcessor:
    """Handles video processing operations using FFmpeg."""
    
    QUALITY_SETTINGS = {
        VideoQuality.LOW: {
            "width": 640,
            "height": 360,
            "bitrate": "500k",
            "audio_bitrate": "96k",
            "preset": "fast",
            "crf": 28
        },
        VideoQuality.MEDIUM: {
            "width": 1280,
            "height": 720,
            "bitrate": "1500k",
            "audio_bitrate": "128k",
            "preset": "medium",
            "crf": 23
        },
        VideoQuality.HIGH: {
            "width": 1920,
            "height": 1080,
            "bitrate": "3000k",
            "audio_bitrate": "192k",
            "preset": "medium",
            "crf": 20
        },
        VideoQuality.ORIGINAL: {
            "copy": True  # Keep original quality
        }
    }
    
    def __init__(self, storage_service: StorageService):
        self.storage_service = storage_service
        self.temp_dir = Path(tempfile.gettempdir()) / "video_processing"
        self.temp_dir.mkdir(exist_ok=True)
    
    async def get_video_info(self, input_path: str) -> Dict:
        """Extract video metadata using ffprobe."""
        try:
            probe = ffmpeg.probe(input_path)
            video_stream = next(
                (stream for stream in probe["streams"] if stream["codec_type"] == "video"),
                None
            )
            audio_stream = next(
                (stream for stream in probe["streams"] if stream["codec_type"] == "audio"),
                None
            )
            
            if not video_stream:
                raise ValueError("No video stream found")
            
            duration = float(probe["format"]["duration"])
            
            return {
                "duration": duration,
                "width": int(video_stream["width"]),
                "height": int(video_stream["height"]),
                "fps": eval(video_stream["r_frame_rate"]),
                "video_codec": video_stream["codec_name"],
                "audio_codec": audio_stream["codec_name"] if audio_stream else None,
                "bitrate": int(probe["format"]["bit_rate"]),
                "size": int(probe["format"]["size"]),
            }
        except Exception as e:
            logger.error(f"Error getting video info: {e}")
            raise
    
    async def transcode_video(
        self,
        input_path: str,
        output_path: str,
        quality: VideoQuality,
        progress_callback: Optional[callable] = None
    ) -> str:
        """Transcode video to specified quality."""
        try:
            settings = self.QUALITY_SETTINGS[quality]
            
            if settings.get("copy"):
                # Copy original without re-encoding
                stream = ffmpeg.input(input_path)
                stream = ffmpeg.output(stream, output_path, codec="copy")
            else:
                # Get input video info
                info = await self.get_video_info(input_path)
                
                # Calculate output dimensions maintaining aspect ratio
                aspect_ratio = info["width"] / info["height"]
                target_width = settings["width"]
                target_height = settings["height"]
                
                if aspect_ratio > target_width / target_height:
                    output_height = int(target_width / aspect_ratio)
                    output_width = target_width
                else:
                    output_width = int(target_height * aspect_ratio)
                    output_height = target_height
                
                # Ensure dimensions are even (required for H.264)
                output_width = output_width if output_width % 2 == 0 else output_width - 1
                output_height = output_height if output_height % 2 == 0 else output_height - 1
                
                # Build FFmpeg command
                stream = ffmpeg.input(input_path)
                stream = ffmpeg.filter(stream, "scale", width=output_width, height=output_height)
                stream = ffmpeg.output(
                    stream,
                    output_path,
                    vcodec="libx264",
                    acodec="aac",
                    video_bitrate=settings["bitrate"],
                    audio_bitrate=settings["audio_bitrate"],
                    preset=settings["preset"],
                    crf=settings["crf"],
                    movflags="faststart",  # Enable progressive download
                    pix_fmt="yuv420p"  # Ensure compatibility
                )
            
            # Run FFmpeg with progress monitoring
            if progress_callback:
                stream = stream.global_args("-progress", "pipe:1")
                process = stream.run_async(pipe_stdout=True, pipe_stderr=True)
                
                # Monitor progress
                while True:
                    stdout_line = process.stdout.readline()
                    if not stdout_line:
                        break
                    
                    # Parse progress info
                    if stdout_line.startswith(b"out_time_ms="):
                        time_ms = int(stdout_line.split(b"=")[1])
                        progress = min(time_ms / (info["duration"] * 1000000), 1.0)
                        await progress_callback(progress)
                
                process.wait()
            else:
                stream.run(overwrite_output=True)
            
            return output_path
            
        except Exception as e:
            logger.error(f"Error transcoding video: {e}")
            raise
    
    async def generate_thumbnail(
        self,
        input_path: str,
        output_path: str,
        timestamp: float,
        width: int = 320,
        height: int = 180
    ) -> str:
        """Generate thumbnail at specified timestamp."""
        try:
            stream = ffmpeg.input(input_path, ss=timestamp)
            stream = ffmpeg.filter(stream, "scale", width=width, height=height)
            stream = ffmpeg.output(stream, output_path, vframes=1)
            stream.run(overwrite_output=True)
            
            return output_path
            
        except Exception as e:
            logger.error(f"Error generating thumbnail: {e}")
            raise
    
    async def generate_thumbnails(
        self,
        input_path: str,
        count: int = 5,
        width: int = 320,
        height: int = 180
    ) -> List[str]:
        """Generate multiple thumbnails evenly distributed throughout the video."""
        try:
            info = await self.get_video_info(input_path)
            duration = info["duration"]
            
            # Calculate timestamps
            interval = duration / (count + 1)
            timestamps = [interval * (i + 1) for i in range(count)]
            
            thumbnails = []
            for i, timestamp in enumerate(timestamps):
                output_path = self.temp_dir / f"thumb_{i}_{timestamp:.2f}.jpg"
                await self.generate_thumbnail(
                    input_path,
                    str(output_path),
                    timestamp,
                    width,
                    height
                )
                thumbnails.append(str(output_path))
            
            return thumbnails
            
        except Exception as e:
            logger.error(f"Error generating thumbnails: {e}")
            raise
    
    async def extract_audio(
        self,
        input_path: str,
        output_path: str,
        format: str = "mp3",
        bitrate: str = "192k"
    ) -> str:
        """Extract audio track from video."""
        try:
            stream = ffmpeg.input(input_path)
            stream = ffmpeg.output(
                stream,
                output_path,
                acodec="libmp3lame" if format == "mp3" else "aac",
                audio_bitrate=bitrate,
                vn=None  # No video
            )
            stream.run(overwrite_output=True)
            
            return output_path
            
        except Exception as e:
            logger.error(f"Error extracting audio: {e}")
            raise
    
    async def create_preview_clip(
        self,
        input_path: str,
        output_path: str,
        start_time: float,
        duration: float = 30,
        width: int = 640,
        height: int = 360
    ) -> str:
        """Create a preview clip from the video."""
        try:
            stream = ffmpeg.input(input_path, ss=start_time, t=duration)
            stream = ffmpeg.filter(stream, "scale", width=width, height=height)
            stream = ffmpeg.output(
                stream,
                output_path,
                vcodec="libx264",
                acodec="aac",
                preset="fast",
                crf=28,
                movflags="faststart"
            )
            stream.run(overwrite_output=True)
            
            return output_path
            
        except Exception as e:
            logger.error(f"Error creating preview clip: {e}")
            raise
    
    async def add_watermark(
        self,
        input_path: str,
        output_path: str,
        watermark_path: str,
        position: str = "bottom_right",
        opacity: float = 0.3
    ) -> str:
        """Add watermark to video."""
        try:
            main = ffmpeg.input(input_path)
            watermark = ffmpeg.input(watermark_path)
            
            # Calculate position
            positions = {
                "top_left": "10:10",
                "top_right": "W-w-10:10",
                "bottom_left": "10:H-h-10",
                "bottom_right": "W-w-10:H-h-10",
                "center": "(W-w)/2:(H-h)/2"
            }
            
            overlay_position = positions.get(position, positions["bottom_right"])
            
            stream = ffmpeg.filter(
                [main, watermark],
                "overlay",
                x=overlay_position.split(":")[0],
                y=overlay_position.split(":")[1],
                enable=f"between(t,0,20)"  # Show watermark for first 20 seconds
            )
            
            stream = ffmpeg.output(stream, output_path, codec="copy")
            stream.run(overwrite_output=True)
            
            return output_path
            
        except Exception as e:
            logger.error(f"Error adding watermark: {e}")
            raise
    
    async def concatenate_videos(
        self,
        input_paths: List[str],
        output_path: str,
        transition: Optional[str] = None
    ) -> str:
        """Concatenate multiple videos."""
        try:
            inputs = [ffmpeg.input(path) for path in input_paths]
            
            if transition:
                # Add transitions between videos
                # This is more complex and would require xfade filter
                raise NotImplementedError("Transitions not yet implemented")
            else:
                # Simple concatenation
                stream = ffmpeg.concat(*inputs, v=1, a=1)
            
            stream = ffmpeg.output(stream, output_path)
            stream.run(overwrite_output=True)
            
            return output_path
            
        except Exception as e:
            logger.error(f"Error concatenating videos: {e}")
            raise
    
    def cleanup_temp_files(self, files: List[str]):
        """Clean up temporary files."""
        for file_path in files:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                logger.error(f"Error removing temp file {file_path}: {e}")