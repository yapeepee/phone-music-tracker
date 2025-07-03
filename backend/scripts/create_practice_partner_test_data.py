#!/usr/bin/env python3
"""
Create test data for practice partner matching system
"""

import asyncio
import asyncpg
import os
from datetime import time
import uuid

# Database connection settings
POSTGRES_SERVER = os.environ.get("POSTGRES_SERVER", "postgres")
POSTGRES_USER = os.environ.get("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.environ.get("POSTGRES_PASSWORD", "postgres")
POSTGRES_DB = os.environ.get("POSTGRES_DB", "musictracker")

# Build database URL for asyncpg
DB_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}:5432/{POSTGRES_DB}"


async def create_practice_partner_data():
    """Create practice partner test data for existing users"""
    # Connect to database
    conn = await asyncpg.connect(DB_URL)
    
    try:
        print("Creating practice partner test data...")
        print("=" * 50)
        
        # Get test users
        alice = await conn.fetchrow(
            "SELECT id, full_name, timezone FROM users WHERE email = $1",
            "alice@example.com"
        )
        bob = await conn.fetchrow(
            "SELECT id, full_name, timezone FROM users WHERE email = $1",
            "bob@example.com"
        )
        carol = await conn.fetchrow(
            "SELECT id, full_name, timezone FROM users WHERE email = $1",
            "carol@example.com"
        )
        
        if not all([alice, bob, carol]):
            print("Error: Test users not found. Run create_test_data_simple.py first.")
            return
        
        print(f"Found users: {alice['full_name']}, {bob['full_name']}, {carol['full_name']}")
        
        # 1. Create practice preferences
        print("\n1. Creating practice preferences...")
        
        # Check if preferences already exist
        alice_prefs = await conn.fetchrow(
            "SELECT user_id FROM user_practice_preferences WHERE user_id = $1",
            alice['id']
        )
        
        if not alice_prefs:
            await conn.execute("""
                INSERT INTO user_practice_preferences 
                (user_id, is_available_for_partners, skill_level, languages, preferred_communication, max_partners)
                VALUES ($1, $2, $3, $4, $5, $6)
            """, alice['id'], True, 'intermediate', ['English', 'Chinese'], 'in_app', 3)
            print(f"  Created preferences for {alice['full_name']}")
        else:
            print(f"  Preferences already exist for {alice['full_name']}")
        
        bob_prefs = await conn.fetchrow(
            "SELECT user_id FROM user_practice_preferences WHERE user_id = $1",
            bob['id']
        )
        
        if not bob_prefs:
            await conn.execute("""
                INSERT INTO user_practice_preferences 
                (user_id, is_available_for_partners, skill_level, languages, preferred_communication, max_partners)
                VALUES ($1, $2, $3, $4, $5, $6)
            """, bob['id'], True, 'advanced', ['English'], 'video_call', 2)
            print(f"  Created preferences for {bob['full_name']}")
        else:
            print(f"  Preferences already exist for {bob['full_name']}")
        
        carol_prefs = await conn.fetchrow(
            "SELECT user_id FROM user_practice_preferences WHERE user_id = $1",
            carol['id']
        )
        
        if not carol_prefs:
            await conn.execute("""
                INSERT INTO user_practice_preferences 
                (user_id, is_available_for_partners, skill_level, languages, preferred_communication, max_partners)
                VALUES ($1, $2, $3, $4, $5, $6)
            """, carol['id'], True, 'beginner', ['English', 'Spanish'], 'email', 5)
            print(f"  Created preferences for {carol['full_name']}")
        else:
            print(f"  Preferences already exist for {carol['full_name']}")
        
        # 2. Create availability schedules
        print("\n2. Creating availability schedules...")
        
        # Alice: Available Monday, Wednesday, Friday 6-8 PM
        for day in [1, 3, 5]:  # Mon, Wed, Fri
            existing = await conn.fetchrow(
                "SELECT id FROM user_availability WHERE user_id = $1 AND day_of_week = $2",
                alice['id'], day
            )
            
            if not existing:
                await conn.execute("""
                    INSERT INTO user_availability 
                    (id, user_id, day_of_week, start_time, end_time, timezone, is_active)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                """, uuid.uuid4(), alice['id'], day, time(18, 0), time(20, 0), 
                    alice['timezone'], True)
        print(f"  Created availability for {alice['full_name']}: Mon/Wed/Fri 6-8 PM")
        
        # Bob: Available Tuesday, Thursday 7-9 PM
        for day in [2, 4]:  # Tue, Thu
            existing = await conn.fetchrow(
                "SELECT id FROM user_availability WHERE user_id = $1 AND day_of_week = $2",
                bob['id'], day
            )
            
            if not existing:
                await conn.execute("""
                    INSERT INTO user_availability 
                    (id, user_id, day_of_week, start_time, end_time, timezone, is_active)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                """, uuid.uuid4(), bob['id'], day, time(19, 0), time(21, 0), 
                    bob['timezone'], True)
        print(f"  Created availability for {bob['full_name']}: Tue/Thu 7-9 PM")
        
        # Carol: Available every day 4-6 PM
        for day in range(7):  # All days
            existing = await conn.fetchrow(
                "SELECT id FROM user_availability WHERE user_id = $1 AND day_of_week = $2",
                carol['id'], day
            )
            
            if not existing:
                await conn.execute("""
                    INSERT INTO user_availability 
                    (id, user_id, day_of_week, start_time, end_time, timezone, is_active)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                """, uuid.uuid4(), carol['id'], day, time(16, 0), time(18, 0), 
                    carol['timezone'], True)
        print(f"  Created availability for {carol['full_name']}: Every day 4-6 PM")
        
        print("\n" + "=" * 50)
        print("Practice partner test data creation complete!")
        print("\nTest user practice partner settings:")
        print("  - Alice: Intermediate, English/Chinese, Mon/Wed/Fri 6-8 PM")
        print("  - Bob: Advanced, English, Tue/Thu 7-9 PM")
        print("  - Carol: Beginner, English/Spanish, Every day 4-6 PM")
        print("\nAll users are working on pieces, so they should appear in discovery!")
        
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(create_practice_partner_data())