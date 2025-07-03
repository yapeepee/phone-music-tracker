#!/usr/bin/env python3
"""檢查音訊分析狀態的腳本"""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import async_session
from datetime import datetime

async def check_analysis_status():
    """檢查音訊分析的狀態"""
    async with async_session() as session:
        print("\n=== 🎵 音訊分析狀態檢查 ===\n")
        
        # 1. 檢查有多少練習紀錄
        result = await session.execute(
            text("SELECT COUNT(*) as count FROM practice_sessions")
        )
        total_sessions = result.scalar()
        print(f"📊 總練習紀錄數: {total_sessions}")
        
        # 2. 檢查有影片的紀錄
        result = await session.execute(
            text("""
                SELECT COUNT(*) as count 
                FROM practice_sessions 
                WHERE video_url IS NOT NULL
            """)
        )
        video_sessions = result.scalar()
        print(f"📹 有影片的紀錄數: {video_sessions}")
        
        # 3. 檢查分析結果
        result = await session.execute(
            text("SELECT COUNT(*) as count FROM analysis_results")
        )
        analysis_count = result.scalar()
        print(f"🔍 已分析的紀錄數: {analysis_count}")
        
        # 4. 檢查最近的分析結果
        if analysis_count > 0:
            result = await session.execute(
                text("""
                    SELECT 
                        ar.session_id,
                        ar.overall_consistency_score,
                        ar.tempo_score,
                        ar.pitch_score,
                        ar.analyzed_at,
                        ps.note
                    FROM analysis_results ar
                    JOIN practice_sessions ps ON ar.session_id = ps.id
                    ORDER BY ar.analyzed_at DESC
                    LIMIT 3
                """)
            )
            
            print("\n📈 最近的分析結果:")
            print("-" * 70)
            for row in result:
                print(f"\n練習ID: {row.session_id}")
                print(f"備註: {row.note or '(無備註)'}")
                print(f"分析時間: {row.analyzed_at}")
                print(f"整體一致性分數: {row.overall_consistency_score:.1f}%")
                print(f"節奏分數: {row.tempo_score:.1f}%")
                print(f"音準分數: {row.pitch_score:.1f}%")
        
        # 5. 檢查時間序列數據
        result = await session.execute(
            text("""
                SELECT 
                    metric_type,
                    COUNT(*) as count,
                    AVG(value) as avg_value
                FROM practice_metrics
                GROUP BY metric_type
            """)
        )
        
        metrics = list(result)
        if metrics:
            print("\n📊 時間序列指標統計:")
            print("-" * 50)
            for row in metrics:
                print(f"{row.metric_type}: {row.count} 筆資料, 平均值: {row.avg_value:.2f}")
        else:
            print("\n❌ 尚無時間序列數據")
        
        # 6. 檢查處理狀態
        result = await session.execute(
            text("""
                SELECT 
                    processing_status,
                    COUNT(*) as count
                FROM practice_sessions
                WHERE video_url IS NOT NULL
                GROUP BY processing_status
            """)
        )
        
        statuses = list(result)
        if statuses:
            print("\n🔄 影片處理狀態:")
            print("-" * 30)
            for row in statuses:
                print(f"{row.processing_status or 'null'}: {row.count} 個")

if __name__ == "__main__":
    asyncio.run(check_analysis_status())