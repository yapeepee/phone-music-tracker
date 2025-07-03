"""TUS protocol implementation for resumable video uploads."""
import os
import json
import aiofiles
from typing import Optional, Dict
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, Request, Response, HTTPException, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.core.config import settings

router = APIRouter()

# TUS protocol version
TUS_VERSION = "1.0.0"
TUS_MAX_SIZE = settings.MAX_VIDEO_SIZE_MB * 1024 * 1024  # Convert MB to bytes
UPLOAD_DIR = Path("/tmp/tus_uploads")  # Temporary upload directory

# Ensure upload directory exists
UPLOAD_DIR.mkdir(exist_ok=True)


class TusUpload:
    """Represents a TUS upload."""
    
    def __init__(self, upload_id: str, metadata: Dict[str, str]):
        self.id = upload_id
        self.metadata = metadata
        self.offset = 0
        self.size = int(metadata.get("size", "0"))
        self.created_at = datetime.utcnow()
        self.file_path = UPLOAD_DIR / f"{upload_id}.bin"
        self.info_path = UPLOAD_DIR / f"{upload_id}.info"
    
    def save_info(self):
        """Save upload information to disk."""
        info = {
            "id": self.id,
            "metadata": self.metadata,
            "offset": self.offset,
            "size": self.size,
            "created_at": self.created_at.isoformat()
        }
        with open(self.info_path, "w") as f:
            json.dump(info, f)
    
    @classmethod
    def load(cls, upload_id: str) -> Optional["TusUpload"]:
        """Load upload information from disk."""
        info_path = UPLOAD_DIR / f"{upload_id}.info"
        if not info_path.exists():
            return None
        
        with open(info_path, "r") as f:
            info = json.load(f)
        
        upload = cls(upload_id, info["metadata"])
        upload.offset = info["offset"]
        upload.size = info["size"]
        upload.created_at = datetime.fromisoformat(info["created_at"])
        return upload
    
    def delete(self):
        """Delete upload files."""
        if self.file_path.exists():
            self.file_path.unlink()
        if self.info_path.exists():
            self.info_path.unlink()


def parse_metadata(metadata_header: str) -> Dict[str, str]:
    """Parse TUS metadata header."""
    metadata = {}
    if metadata_header:
        for item in metadata_header.split(","):
            if " " in item:
                key, value = item.split(" ", 1)
                # Decode base64 value
                import base64
                try:
                    decoded_value = base64.b64decode(value).decode("utf-8")
                    metadata[key] = decoded_value
                except:
                    metadata[key] = value
    return metadata


@router.options("/upload")
async def tus_options():
    """Handle TUS OPTIONS request."""
    return Response(
        headers={
            "Tus-Resumable": TUS_VERSION,
            "Tus-Version": TUS_VERSION,
            "Tus-Max-Size": str(TUS_MAX_SIZE),
            "Tus-Extension": "creation,termination",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, HEAD, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Upload-Length, Upload-Offset, Tus-Resumable, Upload-Metadata, Authorization",
            "Access-Control-Max-Age": "86400",
        }
    )


@router.post("/upload")
async def tus_create(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Handle TUS creation request."""
    # Get upload length
    upload_length = request.headers.get("Upload-Length")
    if not upload_length:
        raise HTTPException(status_code=400, detail="Upload-Length header required")
    
    try:
        upload_size = int(upload_length)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Upload-Length")
    
    if upload_size > TUS_MAX_SIZE:
        raise HTTPException(status_code=413, detail="File too large")
    
    # Parse metadata
    metadata_header = request.headers.get("Upload-Metadata", "")
    metadata = parse_metadata(metadata_header)
    metadata["size"] = str(upload_size)
    metadata["user_id"] = str(current_user.id)
    
    # Generate upload ID
    import uuid
    upload_id = str(uuid.uuid4())
    
    # Create upload record
    upload = TusUpload(upload_id, metadata)
    upload.save_info()
    
    # Create empty file
    with open(upload.file_path, "wb") as f:
        pass
    
    # Build location URL
    location = f"{request.url.scheme}://{request.url.netloc}{request.url.path}/{upload_id}"
    
    return Response(
        status_code=201,
        headers={
            "Tus-Resumable": TUS_VERSION,
            "Location": location,
            "Upload-Offset": "0",
            "Access-Control-Expose-Headers": "Location, Tus-Resumable, Upload-Offset"
        }
    )


@router.head("/upload/{upload_id}")
async def tus_head(
    upload_id: str,
    current_user: User = Depends(get_current_user)
):
    """Handle TUS HEAD request to get upload offset."""
    upload = TusUpload.load(upload_id)
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    # Verify ownership
    if upload.metadata.get("user_id") != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get actual file size
    if upload.file_path.exists():
        upload.offset = upload.file_path.stat().st_size
    
    return Response(
        headers={
            "Tus-Resumable": TUS_VERSION,
            "Upload-Offset": str(upload.offset),
            "Upload-Length": str(upload.size),
            "Cache-Control": "no-store",
            "Access-Control-Expose-Headers": "Upload-Offset, Upload-Length, Tus-Resumable"
        }
    )


@router.patch("/upload/{upload_id}")
async def tus_patch(
    upload_id: str,
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Handle TUS PATCH request to upload file data."""
    upload = TusUpload.load(upload_id)
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    # Verify ownership
    if upload.metadata.get("user_id") != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check upload offset
    upload_offset = request.headers.get("Upload-Offset")
    if not upload_offset:
        raise HTTPException(status_code=400, detail="Upload-Offset header required")
    
    try:
        offset = int(upload_offset)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Upload-Offset")
    
    # Get current file size
    current_size = 0
    if upload.file_path.exists():
        current_size = upload.file_path.stat().st_size
    
    if offset != current_size:
        raise HTTPException(
            status_code=409,
            detail=f"Upload offset mismatch. Expected {current_size}, got {offset}"
        )
    
    # Read and append data
    content_type = request.headers.get("Content-Type", "application/offset+octet-stream")
    
    if content_type != "application/offset+octet-stream":
        raise HTTPException(status_code=415, detail="Invalid Content-Type")
    
    # Write data to file
    body = await request.body()
    async with aiofiles.open(upload.file_path, "ab") as f:
        await f.write(body)
    
    # Update offset
    new_offset = current_size + len(body)
    upload.offset = new_offset
    upload.save_info()
    
    # Check if upload is complete
    if new_offset >= upload.size:
        # TODO: Trigger video processing here
        pass
    
    return Response(
        status_code=204,
        headers={
            "Tus-Resumable": TUS_VERSION,
            "Upload-Offset": str(new_offset),
            "Access-Control-Expose-Headers": "Upload-Offset, Tus-Resumable"
        }
    )


@router.delete("/upload/{upload_id}")
async def tus_delete(
    upload_id: str,
    current_user: User = Depends(get_current_user)
):
    """Handle TUS DELETE request to cancel upload."""
    upload = TusUpload.load(upload_id)
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    # Verify ownership
    if upload.metadata.get("user_id") != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Delete upload files
    upload.delete()
    
    return Response(
        status_code=204,
        headers={
            "Tus-Resumable": TUS_VERSION
        }
    )


@router.get("/upload/{upload_id}")
async def tus_get(
    upload_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get upload information (not part of TUS spec, but useful)."""
    upload = TusUpload.load(upload_id)
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    # Verify ownership
    if upload.metadata.get("user_id") != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get actual file size
    current_size = 0
    if upload.file_path.exists():
        current_size = upload.file_path.stat().st_size
    
    return {
        "id": upload.id,
        "metadata": upload.metadata,
        "offset": current_size,
        "size": upload.size,
        "progress": (current_size / upload.size * 100) if upload.size > 0 else 0,
        "created_at": upload.created_at.isoformat(),
        "is_complete": current_size >= upload.size
    }