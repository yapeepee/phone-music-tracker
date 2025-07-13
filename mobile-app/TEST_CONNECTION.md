# 🔍 手機連接測試指南

## 問題診斷

您的手機無法連接到後端 API。讓我們一步步解決：

## 步驟 1：確認手機和電腦在同一網路

1. **檢查手機 WiFi**：確保連接到和電腦相同的 WiFi
2. **檢查電腦 IP**：
   - Windows PowerShell：`ipconfig | findstr IPv4`
   - 應該看到：`192.168.8.196`

## 步驟 2：在 Windows 設置端口轉發

**在 Windows PowerShell (以管理員身份運行) 執行：**

```powershell
# 1. 刪除舊的端口轉發（如果有）
netsh interface portproxy delete v4tov4 listenport=8000 listenaddress=0.0.0.0

# 2. 添加新的端口轉發
netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=172.26.153.150

# 3. 檢查端口轉發
netsh interface portproxy show all

# 4. 添加防火牆規則
New-NetFirewallRule -DisplayName "Music Tracker API" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow
```

## 步驟 3：測試連接

1. **從手機瀏覽器測試**：
   - 打開手機瀏覽器
   - 訪問：`http://192.168.8.196:8000/docs`
   - 應該看到 API 文檔頁面

2. **如果看不到，檢查 Windows 防火牆**：
   - Windows 設置 → 更新和安全 → Windows 安全 → 防火牆和網路保護
   - 點擊"允許應用通過防火牆"
   - 確保 Docker Desktop 被允許

## 步驟 4：重啟 Expo

```bash
cd /home/dialunds/music-tracker/mobile-app

# 清除緩存並重啟
npx expo start -c
```

## 步驟 5：如果還是不行，使用 ngrok（最可靠）

1. **安裝 ngrok**（如果還沒有）：
   ```bash
   # Windows PowerShell
   winget install ngrok.ngrok
   ```

2. **運行 ngrok**：
   ```bash
   ngrok http 8000
   ```

3. **更新 .env**：
   ```
   EXPO_PUBLIC_API_URL=https://[你的ngrok地址].ngrok.io/api/v1
   ```

4. **重啟 Expo**：
   ```bash
   npx expo start -c
   ```

## 🧪 快速測試

在手機上創建一個新用戶來測試：
1. 打開 Expo Go
2. 點擊 "Register"
3. 填寫：
   - Email: test@example.com
   - Password: password123
   - Name: Test User
   - Role: Student
4. 如果註冊成功，說明連接正常！

## ⚠️ 常見問題

1. **"Network error" 錯誤**：
   - 確認 API URL 正確
   - 確認防火牆已開放

2. **"Connection refused" 錯誤**：
   - 確認 Docker 服務運行中
   - 確認端口轉發設置正確

3. **無法訪問 API 文檔**：
   - 檢查 Windows 防火牆
   - 嘗試暫時關閉防火牆測試

---

💡 **推薦**：使用 ngrok 是最簡單可靠的方案，可以避免所有網路配置問題！