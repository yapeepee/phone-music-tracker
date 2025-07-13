#!/bin/bash
# 修復手機連接問題的腳本

echo "🔧 修復手機連接問題..."

# 1. 檢查後端服務
echo "1. 檢查後端服務狀態..."
curl -s http://localhost:8000/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 後端服務運行正常"
else
    echo "❌ 後端服務無法訪問，重啟中..."
    cd /home/dialunds/music-tracker
    docker-compose restart backend
    sleep 10
fi

# 2. 獲取 Windows IP
echo -e "\n2. 獲取網路信息..."
WSL_IP=$(hostname -I | awk '{print $1}')
echo "WSL IP: $WSL_IP"

# 3. 測試從 WSL 訪問 Windows IP
echo -e "\n3. 測試網路連接..."
echo "測試 http://192.168.8.196:8000/health ..."
timeout 5 curl -s http://192.168.8.196:8000/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 可以從 WSL 訪問 Windows IP"
else
    echo "❌ 無法從 WSL 訪問 Windows IP"
    echo "⚠️  需要設置端口轉發"
fi

# 4. 顯示解決方案
echo -e "\n📋 解決方案："
echo "=========================================="
echo "方案 1: 在 Windows PowerShell (管理員) 執行："
echo ""
echo "# 添加端口轉發"
echo 'netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress='$WSL_IP
echo ""
echo "# 添加防火牆規則"
echo 'New-NetFirewallRule -DisplayName "Music Tracker API" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow'
echo ""
echo "=========================================="
echo "方案 2: 使用 ngrok (最簡單)："
echo ""
echo "1. 在新終端運行: ngrok http 8000"
echo "2. 複製 https://xxx.ngrok.io URL"
echo "3. 更新 .env: EXPO_PUBLIC_API_URL=https://xxx.ngrok.io/api/v1"
echo "4. 重啟 Expo: npm start"
echo ""
echo "=========================================="

# 5. 檢查當前 .env 設置
echo -e "\n當前 .env 設置："
grep "EXPO_PUBLIC_API_URL" /home/dialunds/music-tracker/mobile-app/.env

echo -e "\n✅ 診斷完成！"