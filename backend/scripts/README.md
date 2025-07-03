# Backend Scripts

This directory contains utility scripts for managing and debugging the Music Practice Tracker backend.

## Scripts

### manual_audio_analysis.py

A script to manually trigger audio analysis for existing practice sessions. This is useful for:
- Re-analyzing sessions after algorithm improvements
- Debugging audio analysis issues
- Testing analysis on specific sessions

**Usage:**

1. Direct Python execution (requires environment setup):
```bash
python manual_audio_analysis.py
```

2. Using Docker (recommended):
```bash
./run_audio_analysis.sh
```

**What it does:**
1. Downloads the audio file from MinIO storage
2. Runs the AudioAnalysisService to extract musical metrics
3. Stores time-series data in the `practice_metrics` table
4. Stores summary data in the `analysis_results` table
5. Updates the session's processing status
6. Displays a detailed analysis report

**Default session:** The script is configured to analyze session `79ceb493-156c-45a4-837b-9438b1923cee`. To analyze a different session, modify the `session_id` variable in the `main()` function.

### run_audio_analysis.sh

A convenience wrapper that runs the manual audio analysis script inside the backend Docker container with the proper environment.

## Adding New Scripts

When adding new scripts:
1. Place Python scripts in this directory
2. Import backend modules using the sys.path insertion pattern shown in manual_audio_analysis.py
3. Create a corresponding shell script wrapper for Docker execution
4. Document the script's purpose and usage in this README