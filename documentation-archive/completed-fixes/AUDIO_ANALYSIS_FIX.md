# 音訊分析 TimescaleDB 修復

## 問題描述
在影片處理階段，音訊分析雖然成功執行，但無法將分析結果儲存到 TimescaleDB，出現以下錯誤：

```
Audio analysis failed: Can't match sentinel values in result set to parameter sets; 
key (datetime.datetime(2025, 6, 27, 6, 55, 43, 326261), 'd9690f1b-093d-45d6-be46-f16f62f25dac', 'TEMPO_BPM') was not found.
```

## 根本原因
`PracticeMetrics` 模型定義中，`session_id` 欄位類型是 `uuid.UUID`：
```python
session_id: Mapped[uuid.UUID] = mapped_column(
    UUID(as_uuid=True), 
    ForeignKey("practice_sessions.id"), 
    nullable=False,
    primary_key=True
)
```

但在 `video_tasks.py` 中，`session_id` 是以字串形式傳入，導致類型不匹配。

## 修復方案
在 `/backend/app/tasks/video_tasks.py` 中，在建立資料庫記錄前先進行 UUID 轉換：

```python
# Convert session_id to UUID if it's a string
if isinstance(session_id, str):
    session_uuid = uuid.UUID(session_id)
else:
    session_uuid = session_id
```

然後在所有建立 `AnalysisResult` 和 `PracticeMetrics` 的地方使用 `session_uuid`。

## 修復後的影響
- ✅ 音訊分析結果可以正確儲存到 `analysis_results` 表
- ✅ 時間序列指標可以正確儲存到 `practice_metrics` 表
- ✅ 包含的指標：
  - Tempo (BPM) 變化
  - Pitch (Hz) 數值與信心度
  - Dynamics (dB) 數值

## 驗證方式
1. 上傳新影片
2. 檢查 Celery 日誌不再出現 "Audio analysis failed" 錯誤
3. 查詢資料庫確認分析資料已儲存：
```sql
SELECT * FROM analysis_results WHERE session_id = 'YOUR_UUID';
SELECT * FROM practice_metrics WHERE session_id = 'YOUR_UUID' LIMIT 10;
```

## 狀態
- ✅ 已修復
- ✅ Celery worker 已重新啟動
- ✅ 準備好處理下一個影片上傳