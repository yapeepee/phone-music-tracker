# WSL2 手機連線完整解決方案 🔧

## 方案一：使用 Expo Go 的 Tunnel 模式（最簡單）

### 1. 先停止所有服務
```bash
# 在 WSL 中
cd /home/dialunds/music-tracker/mobile-app
# 按 Ctrl+C 停止 Expo
```

### 2. 使用 Tunnel 模式啟動
```bash
# 這會建立一個公開的網址，手機可以從任何地方連接
npx expo start --tunnel
```

如果出現錯誤，先安裝：
```bash
npm install -g @expo/ngrok
```

### 3. 等待出現類似這樣的網址：
```
Metro waiting on exp://xx-xxx-xx-xxx.exp.direct:80
```

### 4. 用手機掃描 QR Code 或手動輸入網址

---

## 方案二：使用 LAN 模式（需要同一個網路）

### 1. 找出 WSL2 的實際 IP
```bash
# 在 WSL 中執行
ip addr show eth0 | grep inet | awk '{print $2}' | cut -d/ -f1
```

### 2. 檢查 Windows 防火牆
在 Windows 中：
1. 開啟 Windows Defender 防火牆
2. 點擊「允許應用程式或功能通過 Windows Defender 防火牆」
3. 確保以下程式都有勾選：
   - Node.js
   - Docker Desktop
   - Windows Subsystem for Linux

### 3. 使用 LAN 模式啟動
```bash
cd /home/dialunds/music-tracker/mobile-app
npx expo start --lan
```

---

## 方案三：直接測試（不用手機）

### 在瀏覽器中測試
```bash
cd /home/dialunds/music-tracker/mobile-app
npx expo start --web
```
按 `w` 鍵在瀏覽器開啟（但無法測試相機功能）

---

## 最可能的問題與解決方法

### 1. Windows 防火牆阻擋
**解決方法**：暫時關閉 Windows 防火牆測試
```powershell
# PowerShell (管理員)
netsh advfirewall set allprofiles state off
# 測試完記得開回來
netsh advfirewall set allprofiles state on
```

### 2. WSL2 IP 變動
**解決方法**：每次重啟後 IP 可能改變，需要重新設定

### 3. 路由器隔離
**解決方法**：某些路由器會隔離裝置，試試：
- 連接到同一個 5GHz 或 2.4GHz 網路
- 關閉路由器的 AP 隔離功能

### 4. 使用 Ngrok（終極解決方案）

#### 安裝 ngrok
```bash
# 在 WSL 中
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar -xvf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin/
```

#### 開啟兩個終端視窗

**終端 1 - 後端 API**：
```bash
cd /home/dialunds/music-tracker
docker-compose up
```

**終端 2 - 建立 tunnel**：
```bash
ngrok http 8000
```
記下 Forwarding 的網址（如：https://xxxx.ngrok.io）

#### 更新 .env
```bash
cd /home/dialunds/music-tracker/mobile-app
nano .env
```
改成：
```
EXPO_PUBLIC_API_URL=https://xxxx.ngrok.io/api/v1
```

#### 啟動 Expo
```bash
npx expo start
```

---

## 快速診斷指令

### 1. 檢查後端是否正常
```bash
curl http://localhost:8000/health
```

### 2. 檢查 Expo 是否正常
```bash
curl http://localhost:8081/status
```

### 3. 從 Windows 測試 WSL2 連線
在 Windows CMD：
```cmd
ping 172.26.153.150
```

### 4. 查看所有 port forwarding
在 PowerShell：
```powershell
netsh interface portproxy show all
```

---

## 建議使用順序

1. **先試 Tunnel 模式**（最簡單）
   ```bash
   npx expo start --tunnel
   ```

2. **如果 Tunnel 太慢，試 ngrok**

3. **最後才嘗試 port forwarding**

需要哪個方案的詳細步驟，請告訴我！