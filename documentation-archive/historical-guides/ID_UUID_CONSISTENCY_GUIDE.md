# ID/UUID 一致性指南

## 🎯 概述
本指南詳細說明系統中 ID/UUID 的傳遞流程，確保所有組件之間的一致性。

## 📊 ID 類型

### 1. UUID (線上模式)
- **格式**: `95ac6ba7-e9cc-4e41-8010-0e09d5b29ba5`
- **來源**: PostgreSQL 資料庫
- **使用時機**: 網路連線時

### 2. Timestamp ID (離線模式)
- **格式**: `1751005601647`
- **來源**: `Date.now().toString()`
- **使用時機**: 離線時的臨時 ID

## 🔄 完整傳遞流程

### Frontend 流程

#### 1. Session 建立 (`practiceSlice.ts`)
```typescript
// createSessionHybrid
if (netState.isConnected) {
    // 線上：從後端獲得 UUID
    const response = await practiceService.createSession({...});
    session.id = response.id; // UUID
} else {
    // 離線：使用 timestamp
    session.id = Date.now().toString();
}
```

#### 2. 影片錄製 (`NewSessionScreen.tsx`)
```tsx
<VideoRecorder
    sessionId={currentSession?.id || ''}  // 傳遞 session ID
    onVideoRecorded={handleVideoRecorded}
/>
```

#### 3. 影片儲存 (`video.service.ts`)
```typescript
// saveVideo
const destinationUri = `${this.VIDEO_DIR}${sessionId}_${fileName}`;
// 檔名格式: {sessionId}_practice_video_{timestamp}.mp4
```

#### 4. 影片上傳 (`useVideoUpload.ts`)
```typescript
// uploadFromPath
metadata: sessionId ? { session_id: sessionId } : undefined
```

#### 5. 上傳服務 (`video-upload.service.ts`)
```typescript
// Session ID 提取（依優先順序）
const sessionId = 
    options.metadata?.session_id ||                              // 1. metadata
    options.fileName.match(/^([a-f0-9-]+|\d+)_practice_video/i)?.[1] ||  // 2. 檔名
    'unknown';                                                   // 3. 預設值

// 上傳路徑
`${this.uploadEndpoint}/upload-multipart/${sessionId}`
```

### Backend 流程

#### 1. Session API (`sessions.py`)
```python
@router.post("/", response_model=PracticeSession)
async def create_session(...):
    session = await service.create_session(...)
    # 返回包含 UUID 的 session
    return PracticeSession.model_validate(session_dict)
```

#### 2. 影片上傳 (`video_processing.py`)
```python
@router.post("/upload-multipart/{session_id}")
async def upload_video_multipart(
    session_id: str,  # 接受 UUID 或 timestamp
    video: UploadFile = File(...)
):
    # 儲存原始檔案
    s3_key = f"videos/original/session_{session_id}_{filename}"
```

#### 3. Celery 處理 (`video_tasks.py`)
```python
def process_video(
    session_id: Union[str, uuid.UUID],  # 接受兩種格式
    ...
):
    # 類型轉換
    if isinstance(session_id, str):
        try:
            session_uuid = uuid.UUID(session_id)
        except ValueError:
            # 是 timestamp ID，跳過 DB 操作
            return
```

#### 4. 音訊分析儲存
```python
# 轉換為 UUID 物件
if isinstance(session_id, str):
    session_uuid = uuid.UUID(session_id)
else:
    session_uuid = session_id

# 使用 bulk insert
metrics_to_insert.append({
    "session_id": session_uuid,  # UUID 物件
    ...
})
db.bulk_insert_mappings(PracticeMetrics, metrics_to_insert)
```

## ⚠️ 重要注意事項

### 1. 類型一致性
- Frontend: 始終使用字串格式的 ID
- Backend API: 接受字串，內部轉換為 UUID
- Database: 儲存為 UUID 類型

### 2. 檔名格式
- **格式**: `{sessionId}_practice_video_{timestamp}.mp4`
- **範例**: `95ac6ba7-e9cc-4e41-8010-0e09d5b29ba5_practice_video_2025-06-27T07-04-15-625Z.mp4`

### 3. 錯誤處理
- 非 UUID 格式的 session ID 會跳過資料庫操作
- 但檔案處理仍會正常進行

### 4. Metadata 傳遞
- 優先使用 metadata 中的 session_id
- 備用方案是從檔名提取

## 🔍 除錯檢查點

1. **Frontend Console**
   ```javascript
   console.log('Current session ID:', currentSession?.id);
   console.log('Upload metadata:', { session_id: sessionId });
   ```

2. **Backend Logs**
   ```bash
   docker-compose logs backend | grep "upload-multipart"
   ```

3. **Celery Logs**
   ```bash
   docker-compose logs celery-worker | grep "session_id"
   ```

4. **Database Query**
   ```sql
   SELECT id FROM practice_sessions WHERE id = 'YOUR_UUID'::uuid;
   ```

## ✅ 最佳實踐

1. **始終在 metadata 中傳遞 session_id**
2. **保持檔名格式一致**
3. **後端做好類型轉換**
4. **使用 bulk insert 避免 composite key 問題**
5. **記錄所有 ID 轉換和傳遞**

## 📝 更新歷史
- 2025-06-28: 初始文檔建立
- 修復所有 ID/UUID 不一致問題
- 建立完整的傳遞流程文檔