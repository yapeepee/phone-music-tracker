#!/usr/bin/env python3
"""Create test users for development"""
import asyncio
import json
from uuid import uuid4
from passlib.context import CryptContext
from sqlalchemy import text
from app.db.session import engine, AsyncSessionLocal

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_test_users():
    async with AsyncSessionLocal() as db:
        try:
            # Create student user
            student_id = uuid4()
            student_password_hash = pwd_context.hash("password123")
            
            await db.execute(text("""
                INSERT INTO users (id, email, hashed_password, full_name, role, timezone, is_active, is_verified)
                VALUES (:id, :email, :password, :full_name, :role, :timezone, :is_active, :is_verified)
                ON CONFLICT (email) DO NOTHING
            """), {
                "id": student_id,
                "email": "student@example.com",
                "password": student_password_hash,
                "full_name": "Test Student",
                "role": "STUDENT",
                "timezone": "UTC",
                "is_active": True,
                "is_verified": True
            })
            
            # Create student profile (will be linked to teacher after teacher is created)
            await db.execute(text("""
                INSERT INTO students (user_id, instrument, level, practice_goal_minutes)
                VALUES (:user_id, :instrument, :level, :practice_goal)
                ON CONFLICT (user_id) DO NOTHING
            """), {
                "user_id": student_id,
                "instrument": "Piano",
                "level": "INTERMEDIATE",
                "practice_goal": 30
            })
            
            # Create teacher user
            teacher_id = uuid4()
            teacher_password_hash = pwd_context.hash("password123")
            
            await db.execute(text("""
                INSERT INTO users (id, email, hashed_password, full_name, role, timezone, is_active, is_verified)
                VALUES (:id, :email, :password, :full_name, :role, :timezone, :is_active, :is_verified)
                ON CONFLICT (email) DO NOTHING
            """), {
                "id": teacher_id,
                "email": "teacher@example.com",
                "password": teacher_password_hash,
                "full_name": "Test Teacher",
                "role": "TEACHER",
                "timezone": "UTC",
                "is_active": True,
                "is_verified": True
            })
            
            # Create teacher profile
            await db.execute(text("""
                INSERT INTO teachers (user_id, bio, specialties, default_tags, years_experience)
                VALUES (:user_id, :bio, :specialties, :tags, :years)
                ON CONFLICT (user_id) DO NOTHING
            """), {
                "user_id": teacher_id,
                "bio": "Experienced music teacher",
                "specialties": json.dumps(["Piano", "Music Theory"]),
                "tags": json.dumps([
                    {"name": "technique", "color": "#FF6B6B"},
                    {"name": "musicality", "color": "#4ECDC4"},
                    {"name": "rhythm", "color": "#45B7D1"},
                    {"name": "scales", "color": "#FFA07A"}
                ]),
                "years": 10
            })
            
            # Link student to teacher
            await db.execute(text("""
                UPDATE students 
                SET primary_teacher_id = :teacher_id
                WHERE user_id = :student_id
            """), {
                "teacher_id": teacher_id,
                "student_id": student_id
            })
            
            await db.commit()
            print("✅ Test users created successfully!")
            print("Student: student@example.com / password123")
            print("Teacher: teacher@example.com / password123")
            print(f"Student is linked to Teacher")
            
        except Exception as e:
            print(f"❌ Error creating test users: {e}")
            await db.rollback()
        finally:
            await db.close()

if __name__ == "__main__":
    asyncio.run(create_test_users())