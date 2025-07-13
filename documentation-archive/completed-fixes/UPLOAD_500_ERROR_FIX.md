# 🔥 500 Internal Server Error - Fixed!

## 🐛 Root Causes Found

### 1. Missing Database Columns
The model defined these columns but they didn't exist in the database:
- `processing_result` (JSONB)
- `processing_started_at` (TIMESTAMP)
- `processing_completed_at` (TIMESTAMP)

**Error**: `column practice_sessions.processing_result does not exist`

### 2. Session ID Type Mismatch
- **Frontend**: Sends numeric timestamp IDs for offline sessions (e.g., `1750944197083`)
- **Backend**: Expected UUID format for practice_sessions table
- **SQL Error**: Tried to cast numeric ID to UUID: `WHERE practice_sessions.id = $1::UUID`

## ✅ Fixes Applied

### 1. Added Missing Columns
```sql
ALTER TABLE practice_sessions
ADD COLUMN IF NOT EXISTS processing_result JSONB,
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMP WITH TIME ZONE;
```

### 2. Updated Video Upload Endpoint
- Changed to handle both UUID (database sessions) and timestamp (offline sessions)
- Temporary sessions are stored in `/videos/temp/user_{id}/` folder
- Database sessions are stored in `/videos/original/session_{id}/` folder

## 🧪 Test Now

1. Reload your Expo app
2. Record and upload a video
3. Should work without 500 errors!

## 🔄 How It Works Now

### For Offline Sessions (timestamp IDs):
1. Video uploads to temporary storage
2. No immediate processing
3. Will be processed when session syncs to database

### For Online Sessions (UUID IDs):
1. Video uploads to permanent storage
2. Triggers video processing immediately
3. Updates session with processing status

## 📝 Key Learnings

1. **Always run migrations** when model fields are added
2. **Check ID types** - Frontend uses timestamps, backend uses UUIDs
3. **500 errors** usually mean database schema mismatch
4. **Check logs first** - `docker-compose logs backend` reveals the actual error

## 🚀 Next Steps

The video upload should work perfectly now. The system gracefully handles both:
- Offline sessions (timestamp IDs) → temporary storage
- Online sessions (UUID IDs) → permanent storage + processing