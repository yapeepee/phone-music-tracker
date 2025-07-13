# 📱 測試帳號資訊

## 測試步驟

### 1. 重啟 Expo（重要！）
```bash
cd /home/dialunds/music-tracker/mobile-app

# 停止現有的 Expo（按 Ctrl+C）
# 清除緩存並重啟
npx expo start -c
```

### 2. 在手機上測試

#### 方法 A：創建新帳號
1. 打開 Expo Go
2. 掃描新的 QR Code
3. 點擊 "Register"
4. 填寫：
   - Email: test@example.com
   - Password: password123
   - Name: Test User
   - Role: Student
5. 點擊 "Register"

#### 方法 B：使用現有帳號（如果已創建）
1. 點擊 "Login"
2. 輸入：
   - Email: student@example.com
   - Password: password123
3. 點擊 "Login"

### 3. 測試功能

登入成功後，您可以：
1. **創建練習記錄**：點擊 "Start Practice Session"
2. **錄製視頻**：點擊 "Record Video" 
3. **查看上傳進度**：錄製完成後會自動上傳
4. **查看處理狀態**：在 http://localhost:5555 監控視頻處理

## 🔍 確認連接成功

如果您能：
- ✅ 成功註冊或登入
- ✅ 看到 Home 畫面
- ✅ 沒有看到紅色錯誤訊息

表示連接完全正常！

## 🚀 可用的功能

1. **練習記錄**
   - 創建新的練習 session
   - 選擇練習重點（technique, musicality等）
   - 自我評分（1-5星）
   - 添加筆記

2. **視頻錄製**
   - 30秒到5分鐘的視頻
   - 自動上傳到後端
   - 背景上傳支持
   - 上傳進度顯示

3. **視頻處理**（後端自動）
   - 轉碼成多種質量（360p, 720p, 1080p）
   - 生成縮圖
   - 提取音頻
   - 在 Flower 監控進度

## 📊 監控工具

- **API 文檔**：http://localhost:8000/docs
- **Flower（任務監控）**：http://localhost:5555
- **MinIO（文件存儲）**：http://localhost:9001
  - 用戶名：minioadmin
  - 密碼：minioadmin

---

現在您的手機 App 應該可以正常使用了！ 🎉