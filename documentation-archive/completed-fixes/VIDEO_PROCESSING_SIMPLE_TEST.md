# 視頻處理簡易測試指南

## 🎯 最簡單的測試方式：使用手機 App

### 步驟 1：確認所有服務運行中
```bash
cd /home/dialunds/music-tracker
docker-compose ps
```

所有服務應該顯示 "healthy" 狀態。

### 步驟 2：從手機 App 測試

1. **打開手機上的 Expo Go**
2. **登入學生帳號**
3. **開始練習**
   - 點擊 "Start Practice Session"
   - 填寫練習資訊
   - 點擊 "Record Video"
4. **錄製並上傳視頻**
   - 錄製 10-30 秒的視頻
   - 點擊 "Use Video"
   - 視頻會自動上傳
5. **檢查處理狀態**
   - 上傳完成後，後台會自動處理視頻
   - 處理包括：轉碼、生成縮圖、提取音頻

### 步驟 3：監控處理進度

#### 方法 A：使用 Flower 網頁界面（推薦）
1. 打開瀏覽器
2. 訪問：http://localhost:5555
3. 點擊 "Tasks" 標籤
4. 你會看到：
   - `process_video` - 主要處理任務
   - 處理進度百分比
   - 成功/失敗狀態

#### 方法 B：查看 Docker 日誌
```bash
# 查看處理日誌
docker-compose logs -f celery-worker
```

### 步驟 4：檢查處理結果

#### 在 MinIO 查看文件：
1. 打開瀏覽器
2. 訪問：http://localhost:9001
3. 登入：
   - 用戶名：minioadmin
   - 密碼：minioadmin
4. 進入 `music-tracker` bucket
5. 查看文件夾：
   - `videos/originals/` - 原始視頻
   - `videos/processed/` - 處理後的視頻（不同質量）
   - `videos/thumbnails/` - 生成的縮圖
   - `videos/audio/` - 提取的音頻

## 🔍 如何判斷處理成功？

### ✅ 成功的標誌：
1. Flower 顯示任務狀態為 "SUCCESS"
2. MinIO 中有生成的文件
3. 沒有錯誤日誌

### ❌ 如果失敗：
1. 檢查 Flower 中的錯誤信息
2. 查看 Docker 日誌：
   ```bash
   docker-compose logs celery-worker | grep ERROR
   ```

## 💡 快速測試命令

### 檢查處理隊列：
```bash
# 查看待處理的任務數
docker-compose exec redis redis-cli LLEN celery
```

### 查看數據庫中的視頻狀態：
```bash
# 查看最近的視頻處理狀態
docker-compose exec postgres psql -U postgres -d musictracker -c "SELECT id, filename, processing_status, processing_progress FROM videos ORDER BY created_at DESC LIMIT 5;"
```

### 重啟處理服務（如果需要）：
```bash
docker-compose restart celery-worker
```

## 📊 處理時間預期

對於一個 30 秒的視頻：
- 上傳時間：5-10 秒
- 處理開始：< 5 秒
- 轉碼完成：30-60 秒
- 縮圖生成：5-10 秒
- 音頻提取：10-20 秒

## 🚀 進階測試（可選）

### 使用 Postman 或 Thunder Client：

1. **獲取登入令牌**
   - POST 請求到：`http://localhost:8000/api/v1/auth/login`
   - Body (JSON)：
     ```json
     {
       "username": "student@example.com",
       "password": "password123"
     }
     ```
   - 複製返回的 `access_token`

2. **上傳視頻**
   - POST 請求到：`http://localhost:8000/api/v1/videos/upload/test123`
   - Headers：
     - Authorization: Bearer [你的token]
   - Body：
     - 選擇 form-data
     - 添加 file 欄位，選擇視頻文件

3. **檢查狀態**
   - GET 請求到：`http://localhost:8000/api/v1/videos/test123/status`
   - Headers：
     - Authorization: Bearer [你的token]

---

這樣測試更簡單，不需要使用複雜的命令行！ 😊