# Video Upload API Documentation

## Overview

The video upload service implements the TUS (Tus Upload System) protocol for resumable file uploads, allowing mobile clients to upload practice session videos reliably even with unstable network connections.

## Features

- **Resumable Uploads**: Using TUS protocol v1.0.0
- **Chunk-based Transfer**: Default 5MB chunks
- **Progress Tracking**: Real-time upload progress
- **Expiration Handling**: 24-hour upload sessions
- **S3/MinIO Integration**: Direct multipart uploads to object storage
- **Security**: User authentication and session ownership validation

## API Endpoints

### Standard REST Endpoints

#### Initialize Upload
```
POST /api/v1/videos/upload/init
```
Creates a new upload session for a video.

Request Body:
```json
{
  "session_id": "uuid",
  "filename": "practice_video.mp4",
  "file_size": 52428800,
  "duration_seconds": 180,
  "content_type": "video/mp4"
}
```

Response:
```json
{
  "upload_id": "abc123...",
  "upload_url": "/api/v1/videos/tus/abc123...",
  "expires_at": "2024-01-02T12:00:00Z",
  "chunk_size": 5242880
}
```

#### Get Upload Status
```
GET /api/v1/videos/upload/{upload_id}/status
```

Response:
```json
{
  "upload_id": "abc123...",
  "offset": 10485760,
  "size": 52428800,
  "completed": false,
  "expires_at": "2024-01-02T12:00:00Z",
  "percentage": 20.0
}
```

#### Complete Upload
```
POST /api/v1/videos/upload/complete
```

Request Body:
```json
{
  "upload_id": "abc123..."
}
```

#### Abort Upload
```
DELETE /api/v1/videos/upload/{upload_id}
```

### TUS Protocol Endpoints

#### OPTIONS - Server Capabilities
```
OPTIONS /api/v1/videos/tus
OPTIONS /api/v1/videos/tus/{upload_id}
```

Response Headers:
```
Tus-Resumable: 1.0.0
Tus-Version: 1.0.0
Tus-Max-Size: 524288000
Tus-Extension: creation,creation-with-upload,termination,concatenation
```

#### POST - Create Upload
```
POST /api/v1/videos/tus
```

Headers:
```
Tus-Resumable: 1.0.0
Upload-Length: 52428800
Upload-Metadata: filename cHJhY3RpY2VfdmlkZW8ubXA0,session_id YWJjMTIzLi4u
```

Response:
```
201 Created
Location: /api/v1/videos/tus/abc123...
Tus-Resumable: 1.0.0
```

#### HEAD - Get Upload Status
```
HEAD /api/v1/videos/tus/{upload_id}
```

Response Headers:
```
Upload-Offset: 10485760
Upload-Length: 52428800
Tus-Resumable: 1.0.0
```

#### PATCH - Upload Chunk
```
PATCH /api/v1/videos/tus/{upload_id}
```

Headers:
```
Tus-Resumable: 1.0.0
Upload-Offset: 10485760
Content-Type: application/offset+octet-stream
Upload-Checksum: sha1 1234567890abcdef
```

Body: Binary chunk data

Response:
```
204 No Content
Upload-Offset: 15728640
Tus-Resumable: 1.0.0
```

#### DELETE - Terminate Upload
```
DELETE /api/v1/videos/tus/{upload_id}
```

## Usage Example (JavaScript/React Native)

```javascript
import * as tus from 'tus-js-client';

// Initialize upload
const response = await fetch('/api/v1/videos/upload/init', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    session_id: sessionId,
    filename: 'practice_video.mp4',
    file_size: file.size,
    duration_seconds: videoDuration
  })
});

const { upload_url } = await response.json();

// Create TUS upload
const upload = new tus.Upload(file, {
  endpoint: upload_url,
  retryDelays: [0, 3000, 5000, 10000, 20000],
  metadata: {
    filename: file.name,
    filetype: file.type,
    session_id: sessionId
  },
  headers: {
    'Authorization': `Bearer ${token}`
  },
  chunkSize: 5242880, // 5MB
  onError: (error) => {
    console.error('Upload failed:', error);
  },
  onProgress: (bytesUploaded, bytesTotal) => {
    const percentage = (bytesUploaded / bytesTotal * 100).toFixed(2);
    console.log(`Uploaded ${percentage}%`);
  },
  onSuccess: () => {
    console.log('Upload completed');
    // Complete the upload
    fetch('/api/v1/videos/upload/complete', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ upload_id: uploadId })
    });
  }
});

// Start upload
upload.start();

// Pause upload
upload.abort();

// Resume upload
upload.start();
```

## Configuration

Environment variables:
```bash
# S3/MinIO Configuration
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=musictracker-media
S3_ENDPOINT_URL=http://localhost:9000  # For MinIO

# Upload Limits
MAX_VIDEO_SIZE_MB=500
MAX_VIDEO_DURATION_MINUTES=5
```

## Error Handling

Common error responses:

- `400 Bad Request`: Invalid request data or upload parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: User doesn't have access to the session
- `404 Not Found`: Upload or video not found
- `409 Conflict`: Upload offset mismatch
- `413 Payload Too Large`: File exceeds size limit
- `460 Checksum Mismatch`: Chunk checksum verification failed

## Security Considerations

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: Users can only upload videos to their own sessions
3. **File Validation**: Size and duration limits enforced
4. **Expiration**: Incomplete uploads expire after 24 hours
5. **Direct Upload**: Consider implementing presigned URLs for direct S3 upload

## Database Schema

The `videos` table includes these TUS-specific fields:

```sql
upload_id VARCHAR(100) UNIQUE      -- TUS upload identifier
upload_offset INTEGER DEFAULT 0    -- Current upload progress
upload_completed BOOLEAN DEFAULT FALSE -- Upload completion status
upload_metadata TEXT              -- JSON metadata (S3 upload info)
upload_expires_at TIMESTAMP       -- Upload session expiration
```

## Maintenance

### Cleanup Expired Uploads

Run periodically to clean up expired upload sessions:

```python
from app.services.media.video_service import VideoService

async def cleanup_task(db):
    service = VideoService(db)
    count = await service.cleanup_expired_uploads()
    print(f"Cleaned up {count} expired uploads")
```