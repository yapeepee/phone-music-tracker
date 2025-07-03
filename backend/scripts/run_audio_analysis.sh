#!/bin/bash

# Script to run manual audio analysis with Docker environment

echo "Running manual audio analysis for session 79ceb493-156c-45a4-837b-9438b1923cee"
echo "=================================================="

# Change to backend directory
cd /home/dialunds/music-tracker/backend

# Run the script inside the backend container
docker-compose exec backend python scripts/manual_audio_analysis.py

echo "=================================================="
echo "Analysis complete!"