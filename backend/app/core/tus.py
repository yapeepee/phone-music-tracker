"""TUS Protocol implementation for resumable file uploads"""
from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
import json
import base64
from urllib.parse import unquote
import hashlib
import hmac

from fastapi import Request, Response, HTTPException, status
from pydantic import BaseModel


class TusMetadata(BaseModel):
    """TUS upload metadata"""
    filename: str
    filetype: Optional[str] = None
    session_id: Optional[str] = None
    duration: Optional[int] = None
    size: int
    
    @classmethod
    def from_header(cls, header: str) -> "TusMetadata":
        """Parse TUS metadata from Upload-Metadata header"""
        metadata = {}
        if header:
            for pair in header.split(","):
                if " " in pair:
                    key, value = pair.split(" ", 1)
                    try:
                        decoded = base64.b64decode(value).decode("utf-8")
                        metadata[key] = decoded
                    except Exception:
                        metadata[key] = value
        
        # Extract required fields
        return cls(
            filename=metadata.get("filename", "unknown"),
            filetype=metadata.get("filetype"),
            session_id=metadata.get("session_id"),
            duration=int(metadata.get("duration", 0)) if metadata.get("duration") else None,
            size=int(metadata.get("size", 0))
        )
    
    def to_header(self) -> str:
        """Convert metadata to TUS Upload-Metadata header format"""
        pairs = []
        data = {
            "filename": self.filename,
            "size": str(self.size)
        }
        if self.filetype:
            data["filetype"] = self.filetype
        if self.session_id:
            data["session_id"] = self.session_id
        if self.duration:
            data["duration"] = str(self.duration)
            
        for key, value in data.items():
            encoded = base64.b64encode(value.encode()).decode()
            pairs.append(f"{key} {encoded}")
        
        return ",".join(pairs)


class TusResponse:
    """Helper for creating TUS protocol responses"""
    
    @staticmethod
    def options(max_size: int = 524288000) -> Response:  # 500MB default
        """Response for OPTIONS request"""
        return Response(
            status_code=status.HTTP_204_NO_CONTENT,
            headers={
                "Tus-Resumable": "1.0.0",
                "Tus-Version": "1.0.0",
                "Tus-Max-Size": str(max_size),
                "Tus-Extension": "creation,creation-with-upload,termination,concatenation",
                "Access-Control-Allow-Methods": "POST, PATCH, HEAD, OPTIONS, DELETE",
                "Access-Control-Allow-Headers": "Upload-Length, Upload-Offset, Tus-Resumable, Upload-Metadata, Upload-Defer-Length, Upload-Concat",
                "Access-Control-Max-Age": "86400",
            }
        )
    
    @staticmethod
    def created(location: str, offset: int = 0) -> Response:
        """Response for successful upload creation"""
        return Response(
            status_code=status.HTTP_201_CREATED,
            headers={
                "Location": location,
                "Tus-Resumable": "1.0.0",
                "Upload-Offset": str(offset)
            }
        )
    
    @staticmethod
    def head(offset: int, length: int, metadata: Optional[str] = None) -> Response:
        """Response for HEAD request"""
        headers = {
            "Upload-Offset": str(offset),
            "Upload-Length": str(length),
            "Tus-Resumable": "1.0.0",
            "Cache-Control": "no-store"
        }
        if metadata:
            headers["Upload-Metadata"] = metadata
            
        return Response(
            status_code=status.HTTP_200_OK,
            headers=headers
        )
    
    @staticmethod
    def patch_success(offset: int) -> Response:
        """Response for successful PATCH"""
        return Response(
            status_code=status.HTTP_204_NO_CONTENT,
            headers={
                "Upload-Offset": str(offset),
                "Tus-Resumable": "1.0.0"
            }
        )
    
    @staticmethod
    def conflict(message: str = "Upload conflict") -> Response:
        """Response for upload conflicts"""
        return Response(
            status_code=status.HTTP_409_CONFLICT,
            content=message,
            headers={"Tus-Resumable": "1.0.0"}
        )


class TusValidator:
    """Validate TUS protocol requests"""
    
    @staticmethod
    def validate_version(request: Request) -> None:
        """Validate Tus-Resumable header"""
        version = request.headers.get("Tus-Resumable")
        if not version or version != "1.0.0":
            raise HTTPException(
                status_code=status.HTTP_412_PRECONDITION_FAILED,
                detail="Tus-Resumable header must be 1.0.0"
            )
    
    @staticmethod
    def validate_offset(request: Request, expected_offset: int) -> int:
        """Validate and return upload offset"""
        offset_header = request.headers.get("Upload-Offset")
        if not offset_header:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Upload-Offset header is required"
            )
        
        try:
            offset = int(offset_header)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Upload-Offset value"
            )
        
        if offset != expected_offset:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Expected offset {expected_offset}, got {offset}"
            )
        
        return offset
    
    @staticmethod
    def validate_content_type(request: Request) -> None:
        """Validate content type for PATCH requests"""
        content_type = request.headers.get("Content-Type", "")
        if not content_type.startswith("application/offset+octet-stream"):
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Content-Type must be application/offset+octet-stream"
            )
    
    @staticmethod
    def get_upload_length(request: Request) -> Optional[int]:
        """Get upload length from header"""
        length_header = request.headers.get("Upload-Length")
        if length_header:
            try:
                return int(length_header)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid Upload-Length value"
                )
        return None


def generate_upload_id(session_id: str, filename: str) -> str:
    """Generate a unique upload ID"""
    data = f"{session_id}:{filename}:{datetime.utcnow().isoformat()}"
    return hashlib.sha256(data.encode()).hexdigest()[:32]


def parse_checksum_header(header: Optional[str]) -> Optional[Tuple[str, str]]:
    """Parse Upload-Checksum header"""
    if not header:
        return None
    
    parts = header.split(" ", 1)
    if len(parts) != 2:
        return None
    
    algorithm, checksum = parts
    return algorithm.lower(), checksum


def verify_chunk_checksum(
    data: bytes, 
    algorithm: str, 
    expected: str
) -> bool:
    """Verify chunk checksum"""
    if algorithm == "sha1":
        computed = hashlib.sha1(data).hexdigest()
    elif algorithm == "md5":
        computed = hashlib.md5(data).hexdigest()
    elif algorithm == "sha256":
        computed = hashlib.sha256(data).hexdigest()
    else:
        return False
    
    return computed.lower() == expected.lower()


def calculate_expiry(hours: int = 24) -> datetime:
    """Calculate upload expiry time"""
    return datetime.utcnow() + timedelta(hours=hours)