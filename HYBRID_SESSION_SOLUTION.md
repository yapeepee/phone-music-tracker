# 🚀 Hybrid Session Creation Solution

## 📱 解決方案說明 / Solution Explanation

### 之前的問題 / Previous Issue
即使你**連網使用**，app 還是會創建 timestamp ID (例如 "1750991604496")，因為原本的設計是「離線優先」- 總是先創建本地 session。

Even when **online**, the app created timestamp IDs (like "1750991604496") because the original design was "offline-first" - always creating local sessions first.

### 新的解決方案 / New Solution
現在實作了**混合模式 (Hybrid Mode)**：

1. **連網時 / When Online**: 
   - 直接呼叫後端 API 創建 session
   - 立即獲得 UUID (例如 "79ceb493-156c-45a4-837b-9438b1923cee")
   - 影片會連結到真正的資料庫 session

2. **離線時 / When Offline**:
   - 創建本地 session (timestamp ID)
   - 等待網路恢復後同步
   - 保持原有的離線功能

## 🔧 技術實作 / Technical Implementation

### 修改的檔案 / Modified Files:
```
1. /mobile-app/src/store/slices/practiceSlice.ts
   - 新增 createSessionHybrid async thunk
   - 檢查網路狀態並決定創建模式

2. /mobile-app/src/screens/student/NewSessionScreen.tsx
   - 使用新的 createSessionHybrid 取代舊的 startSession

3. /API_PATHS_AND_VARIABLES.md
   - 記錄新的 session 創建流程
   - 保持變數命名一致性
```

### 變數一致性 / Variable Consistency ✅
維持所有變數命名規則：
- `student_id` (with underscore)
- `created_at`, `updated_at` (with underscores)
- `session_id` in responses

## 🎯 好處 / Benefits

1. **即時連結**: 連網錄製的影片會立即連結到資料庫 session
2. **離線支援**: 保持原有的離線錄製功能
3. **無縫切換**: 自動偵測網路狀態
4. **向後相容**: 不影響已存在的 timestamp sessions

## 📱 使用方式 / How to Use

不需要改變任何操作！App 會自動：
1. 偵測你是否連網
2. 選擇最佳的 session 創建方式
3. 確保影片正確連結到 session

No need to change anything! The app will automatically:
1. Detect if you're online
2. Choose the best session creation method
3. Ensure videos are properly linked to sessions

## 🔍 如何驗證 / How to Verify

當你開始新的練習 session：
- **連網時**: Session ID 會是 UUID 格式
- **離線時**: Session ID 會是 timestamp 格式

影片處理會對兩種格式都正常運作！

---

**Created**: 2025-06-27  
**Purpose**: 解決連網時仍產生 temporary session 的問題  
**Status**: ✅ 實作完成，保持變數一致性！