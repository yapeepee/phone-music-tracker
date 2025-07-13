# Music Practice Tracker - 使用者指南

## 📱 快速開始

### 1. 安裝與設定

#### 前置需求
- Node.js 18+ 
- Docker & Docker Compose
- iOS/Android 模擬器或實體裝置

#### 安裝步驟

```bash
# 1. Clone 專案
git clone https://github.com/yapeepee/phone-music-tracker.git
cd music-tracker

# 2. 啟動後端服務
docker-compose up -d

# 3. 安裝前端依賴
cd mobile-app
npm install

# 4. 啟動 Expo
npm start
```

### 2. 創建測試資料

```bash
# 執行測試資料腳本
docker-compose exec backend python scripts/create_test_data_simple.py
```

測試帳號：
- 學生：alice@example.com, bob@example.com, carol@example.com
- 老師：teacher@example.com
- 密碼：testpass123

## 🎵 主要功能

### 學生功能

#### 1. 練習記錄
- 點擊首頁「開始練習」按鈕
- 選擇練習曲目和標籤
- 設定目標節拍（選填）
- 開始計時練習

#### 2. 視頻錄製
- 在練習畫面點擊攝影機圖示
- 錄製練習過程
- 自動上傳並處理

#### 3. 進度分析
- 查看練習統計圖表
- 追蹤每日/每週練習時間
- 分析節拍準確度

#### 4. 社群互動
- 瀏覽論壇討論
- 發表練習心得
- 尋找練習夥伴

### 老師功能

#### 1. 學生管理
- 查看所有學生列表
- 追蹤個別學生進度
- 查看學生練習影片

#### 2. 回饋系統
- 對練習影片加註解
- 給予評分和建議
- 設定練習目標

#### 3. 標籤管理
- 創建自定義標籤
- 管理曲目分類
- 設定難度等級

## 🔧 進階設定

### 環境變數設定

創建 `mobile-app/.env` 檔案：

```env
API_URL=http://192.168.x.x:8000
```

### 資料庫連接

後端會自動連接到 Docker 中的 PostgreSQL。如需自定義：

```bash
# backend/.env
DATABASE_URL=postgresql://user:pass@localhost/dbname
```

## 🚀 常見問題

### Q: 無法連接到後端？
A: 確認 IP 位址設定正確，使用 `ipconfig` (Windows) 或 `ifconfig` (Mac/Linux) 查看本機 IP。

### Q: 視頻上傳失敗？
A: 檢查 MinIO 服務是否正常運行：`docker-compose ps`

### Q: 登入時顯示網路錯誤？
A: 確保手機/模擬器與電腦在同一網路，並檢查防火牆設定。

## 📞 支援

如遇到問題，請查看：
- GitHub Issues: https://github.com/yapeepee/phone-music-tracker/issues
- 錯誤日誌：`docker-compose logs backend`

## 🎯 快速測試流程

1. **登入**：使用 alice@example.com / testpass123
2. **開始練習**：選擇「Bach BWV 1007」
3. **錄製影片**：練習 30 秒以上
4. **查看統計**：前往「分析」頁面
5. **社群互動**：瀏覽論壇或尋找練習夥伴

祝您練習愉快！🎼