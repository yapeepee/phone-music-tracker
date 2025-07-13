#!/bin/bash
# 檢查所有服務狀態

echo "🔍 檢查所有服務狀態..."
echo "=========================="

# 1. 檢查 Docker 服務
echo -e "\n1. Docker 服務："
docker-compose ps --format "table {{.Name}}\t{{.Status}}"

# 2. 檢查後端 API
echo -e "\n2. 後端 API："
if curl -s http://localhost:8000/api/v1/test > /dev/null 2>&1; then
    echo "✅ 後端 API 正常運行"
    echo "   測試 URL: http://localhost:8000/api/v1/test"
else
    echo "❌ 後端 API 無法訪問"
fi

# 3. 檢查 API 文檔
echo -e "\n3. API 文檔："
if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
    echo "✅ API 文檔可訪問: http://localhost:8000/docs"
else
    echo "❌ API 文檔無法訪問"
fi

# 4. 檢查 Flower
echo -e "\n4. Flower 監控："
if curl -s http://localhost:5555 > /dev/null 2>&1; then
    echo "✅ Flower 正常運行: http://localhost:5555"
else
    echo "❌ Flower 無法訪問"
fi

# 5. 檢查 MinIO
echo -e "\n5. MinIO 存儲："
if curl -s http://localhost:9001 > /dev/null 2>&1; then
    echo "✅ MinIO 控制台可訪問: http://localhost:9001"
    echo "   用戶名: minioadmin / 密碼: minioadmin"
else
    echo "❌ MinIO 無法訪問"
fi

# 6. 檢查從 Windows IP 的訪問
echo -e "\n6. Windows IP 訪問測試："
if timeout 5 curl -s http://192.168.8.196:8000/api/v1/test > /dev/null 2>&1; then
    echo "✅ 可以從 Windows IP 訪問 API"
    echo "   手機應該能夠連接！"
else
    echo "⚠️  無法從 Windows IP 訪問"
    echo "   可能需要設置端口轉發或使用 ngrok"
fi

echo -e "\n=========================="
echo "✅ 檢查完成！"