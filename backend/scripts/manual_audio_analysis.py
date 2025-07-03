#!/usr/bin/env python3
"""
Manual audio analysis script for triggering analysis on existing practice sessions.

Usage:
    python manual_audio_analysis.py

This script will:
1. Download the audio file from MinIO
2. Run the AudioAnalysisService on it
3. Store the results in the database (practice_metrics and analysis_results tables)
4. Show the analysis results
"""
import os
import sys
import asyncio
import tempfile
import logging
from datetime import datetime
from pathlib import Path
import json
from typing import Dict, Any
import uuid

# Add the backend directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.core.config import settings
from app.models.practice import PracticeSession, ProcessingStatus
from app.models.analytics import PracticeMetrics, AnalysisResult, MetricType
from app.services.storage import StorageService
from app.services.analytics.audio_analysis import AudioAnalysisService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ManualAudioAnalyzer:
    """Handles manual audio analysis for practice sessions."""
    
    def __init__(self):
        # Create database engine and session
        self.engine = create_async_engine(
            settings.DATABASE_URL,
            echo=False,
            pool_pre_ping=True
        )
        self.async_session = sessionmaker(
            self.engine, 
            class_=AsyncSession, 
            expire_on_commit=False
        )
        
        # Initialize services
        self.storage_service = StorageService(
            bucket_name=settings.S3_BUCKET_NAME,
            endpoint_url=settings.S3_ENDPOINT_URL,
            access_key=settings.S3_ACCESS_KEY or settings.AWS_ACCESS_KEY_ID,
            secret_key=settings.S3_SECRET_KEY or settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        
        self.audio_analysis_service = AudioAnalysisService()
        
        # Create temp directory for downloads
        self.temp_dir = Path(tempfile.gettempdir()) / "manual_audio_analysis"
        self.temp_dir.mkdir(exist_ok=True)
    
    async def analyze_session(self, session_id: str):
        """Analyze audio for a specific session."""
        try:
            logger.info(f"Starting audio analysis for session: {session_id}")
            
            # Get session from database
            async with self.async_session() as db:
                result = await db.execute(
                    select(PracticeSession).where(PracticeSession.id == uuid.UUID(session_id))
                )
                session = result.scalar_one_or_none()
                
                if not session:
                    logger.error(f"Session not found: {session_id}")
                    return
                
                logger.info(f"Found session: {session.id}")
                logger.info(f"  Start time: {session.start_time}")
                logger.info(f"  End time: {session.end_time}")
                logger.info(f"  Focus: {session.focus}")
                logger.info(f"  Processing status: {session.processing_status}")
            
            # Define the audio file S3 key
            audio_s3_key = f"sessions/{session_id}/audio.mp3"
            logger.info(f"Looking for audio file at: {audio_s3_key}")
            
            # Check if audio file exists in MinIO
            if not await self.storage_service.file_exists(audio_s3_key):
                logger.error(f"Audio file not found in MinIO: {audio_s3_key}")
                return
            
            # Download audio file
            local_audio_path = self.temp_dir / f"{session_id}_audio.mp3"
            logger.info(f"Downloading audio to: {local_audio_path}")
            
            await self.storage_service.download_file(
                object_key=audio_s3_key,
                download_path=str(local_audio_path)
            )
            
            file_size_mb = local_audio_path.stat().st_size / (1024 * 1024)
            logger.info(f"Downloaded audio file: {file_size_mb:.2f} MB")
            
            # Run audio analysis
            logger.info("Starting audio analysis...")
            start_time = datetime.utcnow()
            
            analysis_results = await self.audio_analysis_service.analyze_audio_file(
                audio_path=str(local_audio_path)
            )
            
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            logger.info(f"Audio analysis completed in {processing_time:.2f} seconds")
            
            # Store results in database
            await self._store_analysis_results(
                session_id=session_id,
                analysis_results=analysis_results,
                processing_time=processing_time
            )
            
            # Display results
            self._display_results(analysis_results)
            
            # Clean up
            if local_audio_path.exists():
                local_audio_path.unlink()
                logger.info("Cleaned up temporary audio file")
            
            logger.info("Analysis complete!")
            
        except Exception as e:
            logger.error(f"Error during analysis: {e}", exc_info=True)
            raise
    
    async def _store_analysis_results(
        self,
        session_id: str,
        analysis_results: Dict[str, Any],
        processing_time: float
    ):
        """Store analysis results in the database."""
        async with self.async_session() as db:
            try:
                session_uuid = uuid.UUID(session_id)
                
                # Store summary in analysis_results table
                overall_metrics = analysis_results.get("overall_metrics", {})
                tempo_data = analysis_results.get("tempo", {})
                pitch_data = analysis_results.get("pitch", {})
                dynamics_data = analysis_results.get("dynamics", {})
                vibrato_data = analysis_results.get("vibrato", {})
                onset_data = analysis_results.get("note_onsets", {})
                
                analysis_result = AnalysisResult(
                    session_id=session_uuid,
                    analyzed_at=datetime.utcnow(),
                    analysis_version="1.0.0",
                    overall_consistency_score=overall_metrics.get("overall_consistency", 0.0),
                    tempo_score=overall_metrics.get("tempo_score", 0.0),
                    pitch_score=overall_metrics.get("pitch_score", 0.0),
                    dynamics_score=overall_metrics.get("dynamics_score", 0.0),
                    vibrato_score=overall_metrics.get("vibrato_score", 0.0),
                    technical_proficiency_score=overall_metrics.get("technical_proficiency", 0.0),
                    musical_expression_score=overall_metrics.get("musical_expression", 0.0),
                    average_tempo_bpm=tempo_data.get("bpm", 0.0),
                    tempo_stability=tempo_data.get("tempo_stability", 0.0),
                    pitch_range_min_hz=pitch_data.get("pitch_range", {}).get("min_hz", 0.0),
                    pitch_range_max_hz=pitch_data.get("pitch_range", {}).get("max_hz", 0.0),
                    pitch_stability=pitch_data.get("pitch_stability", 0.0),
                    dynamic_range_db=dynamics_data.get("dynamic_range_db", 0.0),
                    dynamics_stability=dynamics_data.get("dynamics_stability", 0.0),
                    vibrato_rate_hz=vibrato_data.get("average_rate_hz", 0.0),
                    vibrato_extent_percent=vibrato_data.get("average_extent_percent", 0.0),
                    note_onset_count=onset_data.get("onset_count", 0),
                    timing_consistency=onset_data.get("timing_consistency", 0.0),
                    full_analysis_data=analysis_results,
                    processing_time_seconds=processing_time
                )
                
                db.add(analysis_result)
                
                # Store time-series metrics in practice_metrics table
                duration = analysis_results.get("duration", 0)
                
                # Create base timestamp for metrics
                base_time = datetime.utcnow()
                
                # Store tempo variations over time
                tempo_variations = tempo_data.get("tempo_variations", [])
                if tempo_variations:
                    time_step = duration / len(tempo_variations) if len(tempo_variations) > 1 else duration
                    for i, tempo in enumerate(tempo_variations[:100]):  # Limit to 100 points
                        metric = PracticeMetrics(
                            time=base_time,
                            session_id=session_uuid,
                            metric_type=MetricType.TEMPO_BPM,
                            value=float(tempo),
                            confidence=1.0,
                            extra_data={"time_offset": i * time_step}
                        )
                        db.add(metric)
                
                # Store pitch values over time
                pitch_values = pitch_data.get("pitch_values", [])
                pitch_confidences = pitch_data.get("pitch_confidences", [])
                if pitch_values:
                    # Sample pitch values (take every nth value to limit data)
                    sample_rate = max(1, len(pitch_values) // 100)
                    for i in range(0, len(pitch_values), sample_rate):
                        metric = PracticeMetrics(
                            time=base_time,
                            session_id=session_uuid,
                            metric_type=MetricType.PITCH_HZ,
                            value=pitch_values[i],
                            confidence=pitch_confidences[i] if i < len(pitch_confidences) else None,
                            extra_data={"time_offset": (i / len(pitch_values)) * duration}
                        )
                        db.add(metric)
                
                # Store dynamics values over time
                db_values = dynamics_data.get("db_values", [])
                if db_values:
                    sample_rate = max(1, len(db_values) // 100)
                    for i in range(0, len(db_values), sample_rate):
                        metric = PracticeMetrics(
                            time=base_time,
                            session_id=session_uuid,
                            metric_type=MetricType.DYNAMICS_DB,
                            value=db_values[i],
                            extra_data={"time_offset": (i / len(db_values)) * duration}
                        )
                        db.add(metric)
                
                # Store overall scores as single-point metrics
                score_metrics = [
                    (MetricType.OVERALL_CONSISTENCY, overall_metrics.get("overall_consistency", 0.0)),
                    (MetricType.TECHNICAL_PROFICIENCY, overall_metrics.get("technical_proficiency", 0.0)),
                    (MetricType.MUSICAL_EXPRESSION, overall_metrics.get("musical_expression", 0.0)),
                    (MetricType.TEMPO_STABILITY, tempo_data.get("tempo_stability", 0.0)),
                    (MetricType.PITCH_STABILITY, pitch_data.get("pitch_stability", 0.0)),
                    (MetricType.DYNAMICS_STABILITY, dynamics_data.get("dynamics_stability", 0.0)),
                    (MetricType.TIMING_CONSISTENCY, onset_data.get("timing_consistency", 0.0)),
                ]
                
                for metric_type, value in score_metrics:
                    metric = PracticeMetrics(
                        time=base_time,
                        session_id=session_uuid,
                        metric_type=metric_type,
                        value=value,
                        confidence=1.0
                    )
                    db.add(metric)
                
                # Update session processing status
                result = await db.execute(
                    select(PracticeSession).where(PracticeSession.id == session_uuid)
                )
                session = result.scalar_one()
                
                session.processing_status = ProcessingStatus.COMPLETED
                session.processing_completed_at = datetime.utcnow()
                session.processing_result = {
                    "audio_analysis": {
                        "completed": True,
                        "duration": duration,
                        "scores": overall_metrics
                    }
                }
                
                await db.commit()
                logger.info("Analysis results stored successfully")
                
            except Exception as e:
                await db.rollback()
                logger.error(f"Error storing results: {e}")
                raise
    
    def _display_results(self, analysis_results: Dict[str, Any]):
        """Display analysis results in a readable format."""
        print("\n" + "="*60)
        print("AUDIO ANALYSIS RESULTS")
        print("="*60)
        
        # Basic info
        duration = analysis_results.get("duration", 0)
        print(f"\nDuration: {duration:.1f} seconds ({duration/60:.1f} minutes)")
        
        # Overall scores
        overall = analysis_results.get("overall_metrics", {})
        print(f"\nOVERALL SCORES:")
        print(f"  Overall Consistency: {overall.get('overall_consistency', 0):.1f}%")
        print(f"  Technical Proficiency: {overall.get('technical_proficiency', 0):.1f}%")
        print(f"  Musical Expression: {overall.get('musical_expression', 0):.1f}%")
        
        # Tempo analysis
        tempo = analysis_results.get("tempo", {})
        print(f"\nTEMPO ANALYSIS:")
        print(f"  BPM: {tempo.get('bpm', 0):.1f}")
        print(f"  Tempo Stability: {tempo.get('tempo_stability', 0):.1%}")
        print(f"  Beat Count: {tempo.get('beat_count', 0)}")
        print(f"  Score: {overall.get('tempo_score', 0):.1f}%")
        
        # Pitch analysis
        pitch = analysis_results.get("pitch", {})
        pitch_range = pitch.get("pitch_range", {})
        print(f"\nPITCH ANALYSIS:")
        print(f"  Average Pitch: {pitch.get('average_pitch_hz', 0):.1f} Hz")
        print(f"  Pitch Range: {pitch_range.get('min_note', 'N/A')} - {pitch_range.get('max_note', 'N/A')}")
        print(f"  Pitch Stability: {pitch.get('pitch_stability', 0):.1%}")
        print(f"  Detection Ratio: {pitch.get('pitch_detected_ratio', 0):.1%}")
        print(f"  Score: {overall.get('pitch_score', 0):.1f}%")
        
        # Dynamics analysis
        dynamics = analysis_results.get("dynamics", {})
        print(f"\nDYNAMICS ANALYSIS:")
        print(f"  Dynamic Range: {dynamics.get('dynamic_range_db', 0):.1f} dB")
        print(f"  Average Level: {dynamics.get('average_db', 0):.1f} dB")
        print(f"  Peak Level: {dynamics.get('peak_db', 0):.1f} dB")
        print(f"  Dynamics Stability: {dynamics.get('dynamics_stability', 0):.1%}")
        print(f"  Score: {overall.get('dynamics_score', 0):.1f}%")
        
        changes = dynamics.get("dynamics_changes", [])
        if changes:
            print(f"  Dynamic Changes: {len(changes)} detected")
            for i, change in enumerate(changes[:5]):
                print(f"    - {change['type'].capitalize()} at {change['time']:.1f}s")
        
        # Vibrato analysis
        vibrato = analysis_results.get("vibrato", {})
        print(f"\nVIBRATO ANALYSIS:")
        print(f"  Average Rate: {vibrato.get('average_rate_hz', 0):.1f} Hz")
        print(f"  Average Extent: {vibrato.get('average_extent_percent', 0):.1f}%")
        print(f"  Consistency: {vibrato.get('vibrato_consistency', 0):.1%}")
        print(f"  Presence Ratio: {vibrato.get('vibrato_presence_ratio', 0):.1%}")
        print(f"  Score: {overall.get('vibrato_score', 0):.1f}%")
        
        segments = vibrato.get("vibrato_segments", [])
        if segments:
            print(f"  Vibrato Segments: {len(segments)} detected")
        
        # Note onset analysis
        onsets = analysis_results.get("note_onsets", {})
        print(f"\nNOTE ONSET ANALYSIS:")
        print(f"  Onset Count: {onsets.get('onset_count', 0)}")
        print(f"  Onset Density: {onsets.get('onset_density', 0):.1f} per second")
        print(f"  Timing Consistency: {onsets.get('timing_consistency', 0):.1%}")
        print(f"  Average Interval: {onsets.get('average_interval', 0):.3f} seconds")
        
        print("\n" + "="*60)


async def main():
    """Main function to run the manual audio analysis."""
    # Session ID to analyze
    session_id = "79ceb493-156c-45a4-837b-9438b1923cee"
    
    # Create analyzer and run analysis
    analyzer = ManualAudioAnalyzer()
    
    try:
        await analyzer.analyze_session(session_id)
    finally:
        # Clean up database connection
        await analyzer.engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())