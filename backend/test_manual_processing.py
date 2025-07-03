#!/usr/bin/env python3
"""Manually trigger video processing for a session."""
import sys
sys.path.insert(0, '/app')

from app.tasks.video_tasks import process_video

# Test with the existing session that failed
session_id = "79ceb493-156c-45a4-837b-9438b1923cee"
video_path = "videos/temp/user_32003f10-fa23-4a16-99af-a41ea08da27f/session_1750953188509_1750953188509_practice_video_2025-06-26T15-53-20-914Z.mp4"
user_id = "32003f10-fa23-4a16-99af-a41ea08da27f"

print(f"Triggering video processing for session: {session_id}")
print(f"Video path: {video_path}")
print(f"User ID: {user_id}")

# Trigger the Celery task
task = process_video.delay(
    session_id,
    video_path,
    user_id,
    ["low", "medium", "high"]
)

print(f"Task ID: {task.id}")
print("Check Celery logs and Flower dashboard for progress")