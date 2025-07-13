# 修復手機連接問題指南

## 問題診斷
您的手機無法連接到後端 API，出現 "Network error" 錯誤。

## 解決方案

### 方案 1：使用 ngrok 隧道（最簡單）

1. **安裝 ngrok**（如果還沒安裝）：
   ```bash
   # 在 Windows PowerShell 中
   winget install ngrok.ngrok
   ```

2. **在 WSL 中啟動 ngrok**：
   ```bash
   # 新開一個終端
   ngrok http 8000
   ```

3. **複製 ngrok URL**：
   - 會看到類似：`https://abc123.ngrok.io`

4. **更新 .env 文件**：
   ```bash
   cd /home/dialunds/music-tracker/mobile-app
   # 編輯 .env，將 API URL 改為 ngrok URL
   EXPO_PUBLIC_API_URL=https://abc123.ngrok.io/api/v1
   ```

5. **重啟 Expo**：
   ```bash
   # 按 Ctrl+C 停止
   npm start
   ```

### 方案 2：修復 Windows IP 連接

1. **確認 Windows IP**：
   在 Windows PowerShell 中：
   ```powershell
   ipconfig | findstr IPv4
   ```

2. **更新後端 CORS 設置**：
   編輯 `/home/dialunds/music-tracker/backend/app/main.py`，確保 CORS 包含您的 IP

3. **更新 .env**：
   ```bash
   EXPO_PUBLIC_API_URL=http://[您的Windows IP]:8000/api/v1
   ```

4. **重啟所有服務**：
   ```bash
   cd /home/dialunds/music-tracker
   docker-compose down
   docker-compose up -d
   ```

5. **重啟 Expo**：
   ```bash
   cd mobile-app
   npm start
   ```

### 方案 3：使用 Expo 隧道模式

1. **停止當前 Expo**（Ctrl+C）

2. **使用隧道模式啟動**：
   ```bash
   cd /home/dialunds/music-tracker/mobile-app
   npx expo start --tunnel
   ```

3. **更新 .env 使用 localhost**：
   ```bash
   EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
   ```

## 🔍 驗證連接

### 1. 測試後端是否運行：
```bash
curl http://localhost:8000/health
```
應該返回：`{"status":"ok"}`

### 2. 測試 API 端點：
```bash
curl http://localhost:8000/api/v1/health
```

### 3. 檢查 Docker 日誌：
```bash
docker-compose logs -f backend
```

## 💡 推薦方案

**最推薦使用 ngrok**，因為：
- 不需要處理複雜的網路配置
- 可以穿透防火牆
- 提供 HTTPS 連接
- 在任何網路環境都能工作

## 🚨 常見問題

1. **防火牆阻擋**：
   - Windows 防火牆可能阻擋 8000 端口
   - 需要添加入站規則

2. **WSL2 網路隔離**：
   - WSL2 使用 NAT 網路
   - 需要端口轉發或隧道

3. **IP 地址變化**：
   - 重啟後 IP 可能改變
   - 使用 ngrok 可避免此問題

---

試試 ngrok 方案，這是最可靠的方法！ 🚀