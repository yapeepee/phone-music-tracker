#!/usr/bin/env python3
"""Process the user's recently uploaded video."""
import sys
sys.path.insert(0, '/app')

from app.tasks.video_tasks import process_video

# User's latest video
session_id = "1750991604496"  # Timestamp session ID
video_path = "videos/temp/user_32003f10-fa23-4a16-99af-a41ea08da27f/session_1750991604496_1750991604496_practice_video_2025-06-27T02-33-41-250Z.mp4"
user_id = "32003f10-fa23-4a16-99af-a41ea08da27f"

print(f"Processing your uploaded video...")
print(f"Session: {session_id}")
print(f"Video: {video_path}")

# Trigger the Celery task
task = process_video.delay(
    session_id,
    video_path, 
    user_id,
    ["low", "medium", "high"]
)

print(f"\n✅ Processing started!")
print(f"Task ID: {task.id}")
print(f"\nMonitor progress at: http://localhost:5555")
print(f"Or check logs: docker-compose logs -f celery-worker")