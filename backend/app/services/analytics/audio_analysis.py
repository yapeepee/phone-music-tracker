"""Audio analysis service using librosa for music practice metrics extraction."""
import os
import tempfile
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import librosa
from scipy import stats

logger = logging.getLogger(__name__)


class AudioAnalysisService:
    """Service for analyzing audio from practice session videos."""
    
    def __init__(self):
        self.temp_dir = Path(tempfile.gettempdir()) / "audio_analysis"
        self.temp_dir.mkdir(exist_ok=True)
        # Default sample rate for analysis
        self.sr = 22050
        # Frame length for analysis windows
        self.frame_length = 2048
        # Hop length between frames
        self.hop_length = 512
    
    async def analyze_audio_file(self, audio_path: str) -> Dict[str, Any]:
        """
        Perform comprehensive audio analysis on a file.
        
        Args:
            audio_path: Path to the audio file
            
        Returns:
            Dictionary containing analysis results
        """
        try:
            # Load audio file
            y, sr = librosa.load(audio_path, sr=self.sr)
            
            # Perform various analyses
            tempo_data = await self._analyze_tempo(y, sr)
            pitch_data = await self._analyze_pitch(y, sr)
            dynamics_data = await self._analyze_dynamics(y, sr)
            vibrato_data = await self._analyze_vibrato(y, sr)
            onset_data = await self._analyze_note_onsets(y, sr)
            
            # Calculate overall metrics
            overall_metrics = await self._calculate_overall_metrics(
                tempo_data, pitch_data, dynamics_data, vibrato_data
            )
            
            return {
                "duration": float(len(y) / sr),
                "sample_rate": sr,
                "tempo": tempo_data,
                "pitch": pitch_data,
                "dynamics": dynamics_data,
                "vibrato": vibrato_data,
                "note_onsets": onset_data,
                "overall_metrics": overall_metrics,
                "timestamps": {
                    "frame_length": self.frame_length,
                    "hop_length": self.hop_length,
                    "frames_per_second": sr / self.hop_length
                }
            }
            
        except Exception as e:
            logger.error(f"Error analyzing audio file: {e}")
            raise
    
    async def _analyze_tempo(self, y: np.ndarray, sr: int) -> Dict[str, Any]:
        """Analyze tempo and rhythm consistency."""
        try:
            # Detect tempo and beats
            tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
            
            # Get beat times
            beat_times = librosa.frames_to_time(beats, sr=sr)
            
            # Calculate inter-beat intervals
            if len(beat_times) > 1:
                beat_intervals = np.diff(beat_times)
                tempo_stability = 1.0 - (np.std(beat_intervals) / np.mean(beat_intervals))
            else:
                beat_intervals = []
                tempo_stability = 0.0
            
            # Dynamic tempo tracking (tempo over time)
            onset_env = librosa.onset.onset_strength(y=y, sr=sr)
            dtempo = librosa.beat.tempo(
                onset_envelope=onset_env,
                sr=sr,
                aggregate=None
            )
            
            return {
                "bpm": float(tempo),
                "beat_times": beat_times.tolist(),
                "tempo_stability": float(tempo_stability),
                "tempo_variations": dtempo.tolist() if len(dtempo.shape) > 0 else [float(tempo)],
                "beat_count": len(beats),
                "average_beat_interval": float(np.mean(beat_intervals)) if len(beat_intervals) > 0 else 0.0
            }
            
        except Exception as e:
            logger.error(f"Error analyzing tempo: {e}")
            return {
                "bpm": 0.0,
                "beat_times": [],
                "tempo_stability": 0.0,
                "tempo_variations": [],
                "beat_count": 0,
                "average_beat_interval": 0.0
            }
    
    async def _analyze_pitch(self, y: np.ndarray, sr: int) -> Dict[str, Any]:
        """Analyze pitch accuracy and stability."""
        try:
            # Extract pitch using piptrack
            pitches, magnitudes = librosa.piptrack(
                y=y,
                sr=sr,
                fmin=50,  # Minimum frequency
                fmax=2000,  # Maximum frequency
                threshold=0.1
            )
            
            # Get pitch values over time
            pitch_values = []
            pitch_confidences = []
            
            for t in range(pitches.shape[1]):
                index = magnitudes[:, t].argmax()
                pitch = pitches[index, t]
                confidence = magnitudes[index, t]
                
                if pitch > 0:  # Valid pitch detected
                    pitch_values.append(float(pitch))
                    pitch_confidences.append(float(confidence))
            
            if pitch_values:
                # Convert to MIDI notes for analysis
                midi_notes = librosa.hz_to_midi(pitch_values)
                
                # Calculate pitch stability
                pitch_stability = 1.0 - (np.std(midi_notes) / (np.max(midi_notes) - np.min(midi_notes) + 1e-6))
                
                # Detect pitch range
                pitch_range = {
                    "min_hz": float(np.min(pitch_values)),
                    "max_hz": float(np.max(pitch_values)),
                    "min_note": librosa.hz_to_note(np.min(pitch_values)),
                    "max_note": librosa.hz_to_note(np.max(pitch_values))
                }
            else:
                midi_notes = []
                pitch_stability = 0.0
                pitch_range = {
                    "min_hz": 0.0,
                    "max_hz": 0.0,
                    "min_note": "N/A",
                    "max_note": "N/A"
                }
            
            return {
                "pitch_values": pitch_values[-1000:],  # Last 1000 values to limit size
                "pitch_confidences": pitch_confidences[-1000:],
                "pitch_stability": float(pitch_stability),
                "pitch_range": pitch_range,
                "average_pitch_hz": float(np.mean(pitch_values)) if pitch_values else 0.0,
                "pitch_detected_ratio": len(pitch_values) / pitches.shape[1]
            }
            
        except Exception as e:
            logger.error(f"Error analyzing pitch: {e}")
            return {
                "pitch_values": [],
                "pitch_confidences": [],
                "pitch_stability": 0.0,
                "pitch_range": {
                    "min_hz": 0.0,
                    "max_hz": 0.0,
                    "min_note": "N/A",
                    "max_note": "N/A"
                },
                "average_pitch_hz": 0.0,
                "pitch_detected_ratio": 0.0
            }
    
    async def _analyze_dynamics(self, y: np.ndarray, sr: int) -> Dict[str, Any]:
        """Analyze dynamic range and volume consistency."""
        try:
            # Calculate RMS energy
            rms = librosa.feature.rms(y=y, frame_length=self.frame_length, hop_length=self.hop_length)[0]
            
            # Convert to dB
            db = librosa.amplitude_to_db(rms, ref=np.max)
            
            # Calculate dynamic range
            dynamic_range = float(np.max(db) - np.min(db))
            
            # Calculate dynamics consistency
            dynamics_stability = 1.0 - (np.std(db) / (dynamic_range + 1e-6))
            
            # Detect crescendos and diminuendos
            dynamics_changes = []
            window_size = int(sr / self.hop_length)  # 1 second window
            
            for i in range(0, len(db) - window_size, window_size // 2):
                window = db[i:i + window_size]
                slope = np.polyfit(range(len(window)), window, 1)[0]
                
                if abs(slope) > 0.5:  # Significant change
                    dynamics_changes.append({
                        "time": float(i * self.hop_length / sr),
                        "type": "crescendo" if slope > 0 else "diminuendo",
                        "magnitude": float(abs(slope))
                    })
            
            return {
                "rms_values": rms.tolist()[-1000:],  # Last 1000 values
                "db_values": db.tolist()[-1000:],
                "dynamic_range_db": dynamic_range,
                "dynamics_stability": float(dynamics_stability),
                "average_db": float(np.mean(db)),
                "peak_db": float(np.max(db)),
                "dynamics_changes": dynamics_changes[:20]  # Limit to 20 most significant
            }
            
        except Exception as e:
            logger.error(f"Error analyzing dynamics: {e}")
            return {
                "rms_values": [],
                "db_values": [],
                "dynamic_range_db": 0.0,
                "dynamics_stability": 0.0,
                "average_db": 0.0,
                "peak_db": 0.0,
                "dynamics_changes": []
            }
    
    async def _analyze_vibrato(self, y: np.ndarray, sr: int) -> Dict[str, Any]:
        """Analyze vibrato characteristics."""
        try:
            # Extract pitch for vibrato analysis
            pitches, magnitudes = librosa.piptrack(
                y=y,
                sr=sr,
                fmin=100,
                fmax=1000,
                threshold=0.2
            )
            
            vibrato_segments = []
            
            # Sliding window for vibrato detection
            window_size = int(0.5 * sr / self.hop_length)  # 0.5 second windows
            
            for i in range(0, pitches.shape[1] - window_size, window_size // 4):
                window_pitches = []
                
                for t in range(i, min(i + window_size, pitches.shape[1])):
                    index = magnitudes[:, t].argmax()
                    pitch = pitches[index, t]
                    if pitch > 0:
                        window_pitches.append(pitch)
                
                if len(window_pitches) > window_size * 0.8:  # Enough valid pitches
                    # Detect periodic variation
                    pitch_array = np.array(window_pitches)
                    pitch_diff = np.diff(pitch_array)
                    
                    # Simple vibrato detection based on zero crossings
                    zero_crossings = np.where(np.diff(np.sign(pitch_diff)))[0]
                    
                    if len(zero_crossings) > 4:  # At least 2 cycles
                        vibrato_rate = len(zero_crossings) / (window_size * self.hop_length / sr) / 2
                        vibrato_extent = np.std(pitch_array) / np.mean(pitch_array) * 100
                        
                        if 4 <= vibrato_rate <= 8 and vibrato_extent > 0.5:  # Typical vibrato range
                            vibrato_segments.append({
                                "time": float(i * self.hop_length / sr),
                                "duration": float(window_size * self.hop_length / sr),
                                "rate_hz": float(vibrato_rate),
                                "extent_percent": float(vibrato_extent)
                            })
            
            # Calculate overall vibrato metrics
            if vibrato_segments:
                avg_rate = np.mean([v["rate_hz"] for v in vibrato_segments])
                avg_extent = np.mean([v["extent_percent"] for v in vibrato_segments])
                consistency = 1.0 - (np.std([v["rate_hz"] for v in vibrato_segments]) / avg_rate)
            else:
                avg_rate = 0.0
                avg_extent = 0.0
                consistency = 0.0
            
            return {
                "vibrato_segments": vibrato_segments[:10],  # Limit to 10 segments
                "average_rate_hz": float(avg_rate),
                "average_extent_percent": float(avg_extent),
                "vibrato_consistency": float(consistency),
                "vibrato_presence_ratio": len(vibrato_segments) * window_size * self.hop_length / len(y)
            }
            
        except Exception as e:
            logger.error(f"Error analyzing vibrato: {e}")
            return {
                "vibrato_segments": [],
                "average_rate_hz": 0.0,
                "average_extent_percent": 0.0,
                "vibrato_consistency": 0.0,
                "vibrato_presence_ratio": 0.0
            }
    
    async def _analyze_note_onsets(self, y: np.ndarray, sr: int) -> Dict[str, Any]:
        """Detect and analyze note onsets."""
        try:
            # Detect onsets
            onset_frames = librosa.onset.onset_detect(
                y=y,
                sr=sr,
                hop_length=self.hop_length,
                backtrack=True
            )
            
            # Convert to time
            onset_times = librosa.frames_to_time(onset_frames, sr=sr, hop_length=self.hop_length)
            
            # Calculate inter-onset intervals
            if len(onset_times) > 1:
                onset_intervals = np.diff(onset_times)
                timing_consistency = 1.0 - (np.std(onset_intervals) / (np.mean(onset_intervals) + 1e-6))
            else:
                onset_intervals = []
                timing_consistency = 0.0
            
            # Onset strength
            onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=self.hop_length)
            
            return {
                "onset_times": onset_times.tolist()[:100],  # Limit to first 100
                "onset_count": len(onset_frames),
                "timing_consistency": float(timing_consistency),
                "average_interval": float(np.mean(onset_intervals)) if len(onset_intervals) > 0 else 0.0,
                "onset_density": len(onset_frames) / (len(y) / sr),  # Onsets per second
                "onset_strength_mean": float(np.mean(onset_env)),
                "onset_strength_std": float(np.std(onset_env))
            }
            
        except Exception as e:
            logger.error(f"Error analyzing note onsets: {e}")
            return {
                "onset_times": [],
                "onset_count": 0,
                "timing_consistency": 0.0,
                "average_interval": 0.0,
                "onset_density": 0.0,
                "onset_strength_mean": 0.0,
                "onset_strength_std": 0.0
            }
    
    async def _calculate_overall_metrics(
        self,
        tempo_data: Dict,
        pitch_data: Dict,
        dynamics_data: Dict,
        vibrato_data: Dict
    ) -> Dict[str, float]:
        """Calculate overall performance metrics based on individual analyses."""
        try:
            # Weighted scoring system
            tempo_score = tempo_data.get("tempo_stability", 0.0) * 100
            pitch_score = pitch_data.get("pitch_stability", 0.0) * 100
            dynamics_score = dynamics_data.get("dynamics_stability", 0.0) * 100
            vibrato_score = min(vibrato_data.get("vibrato_consistency", 0.0) * 100, 100)
            
            # Overall consistency score (weighted average)
            weights = {"tempo": 0.25, "pitch": 0.35, "dynamics": 0.25, "vibrato": 0.15}
            overall_score = (
                tempo_score * weights["tempo"] +
                pitch_score * weights["pitch"] +
                dynamics_score * weights["dynamics"] +
                vibrato_score * weights["vibrato"]
            )
            
            # Technical proficiency indicators
            technical_score = (
                pitch_data.get("pitch_detected_ratio", 0.0) * 50 +
                (1.0 - min(abs(tempo_data.get("bpm", 0) - 120) / 120, 1.0)) * 50
            )
            
            # Expression score based on dynamics and vibrato
            expression_score = (
                min(dynamics_data.get("dynamic_range_db", 0) / 30, 1.0) * 50 +
                vibrato_data.get("vibrato_presence_ratio", 0.0) * 50
            )
            
            return {
                "overall_consistency": float(overall_score),
                "tempo_score": float(tempo_score),
                "pitch_score": float(pitch_score),
                "dynamics_score": float(dynamics_score),
                "vibrato_score": float(vibrato_score),
                "technical_proficiency": float(technical_score),
                "musical_expression": float(expression_score)
            }
            
        except Exception as e:
            logger.error(f"Error calculating overall metrics: {e}")
            return {
                "overall_consistency": 0.0,
                "tempo_score": 0.0,
                "pitch_score": 0.0,
                "dynamics_score": 0.0,
                "vibrato_score": 0.0,
                "technical_proficiency": 0.0,
                "musical_expression": 0.0
            }