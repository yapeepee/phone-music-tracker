#!/usr/bin/env python3
"""
Create test data for Music Practice Tracker using SQL queries
"""

import asyncio
import asyncpg
import os
from datetime import datetime, timezone, timedelta
import uuid
import bcrypt


# Database connection settings
# Use environment variable or Docker service name 'postgres' for container
POSTGRES_SERVER = os.environ.get("POSTGRES_SERVER", "postgres")
POSTGRES_USER = os.environ.get("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.environ.get("POSTGRES_PASSWORD", "postgres")
POSTGRES_DB = os.environ.get("POSTGRES_DB", "musictracker")

# Build database URL for asyncpg
DB_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}:5432/{POSTGRES_DB}"


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


async def create_test_data():
    """Create test data directly with SQL"""
    conn = await asyncpg.connect(DB_URL)
    
    try:
        print("Creating test data for Music Practice Tracker...")
        print("=" * 50)
        
        # Create test users
        print("\n1. Creating test users...")
        test_password = hash_password("testpass123")
        
        users = [
            ("alice@example.com", "Alice Chen", "STUDENT", test_password),
            ("bob@example.com", "Bob Smith", "STUDENT", test_password),
            ("carol@example.com", "Carol Johnson", "STUDENT", test_password),
            ("teacher@example.com", "Dr. David Lee", "TEACHER", test_password),
        ]
        
        user_ids = {}
        for email, full_name, role, hashed_password in users:
            # Check if user exists
            existing = await conn.fetchrow(
                "SELECT id, full_name FROM users WHERE email = $1", email
            )
            
            if existing:
                user_ids[email] = existing['id']
                print(f"User already exists: {existing['full_name']}")
                
                # Check if student/teacher record exists
                if role == "STUDENT":
                    student_exists = await conn.fetchrow(
                        "SELECT user_id FROM students WHERE user_id = $1", existing['id']
                    )
                    if not student_exists:
                        await conn.execute("""
                            INSERT INTO students (user_id, level, practice_goal_minutes)
                            VALUES ($1, 'INTERMEDIATE', 30)
                        """, existing['id'])
                        print(f"Created student record for {existing['full_name']}")
                elif role == "TEACHER":
                    teacher_exists = await conn.fetchrow(
                        "SELECT user_id FROM teachers WHERE user_id = $1", existing['id']
                    )
                    if not teacher_exists:
                        await conn.execute("""
                            INSERT INTO teachers (user_id, bio, hourly_rate, experience_years)
                            VALUES ($1, 'Experienced music teacher', 75.00, 10)
                        """, existing['id'])
                        print(f"Created teacher record for {existing['full_name']}")
            else:
                user_id = await conn.fetchval("""
                    INSERT INTO users (id, email, full_name, role, hashed_password, is_active, is_verified, timezone)
                    VALUES (gen_random_uuid(), $1, $2, $3, $4, true, true, 'America/New_York')
                    RETURNING id
                """, email, full_name, role, hashed_password)
                user_ids[email] = user_id
                print(f"Created user: {full_name} ({email})")
                
                # If user is a student, also create student record
                if role == "STUDENT":
                    await conn.execute("""
                        INSERT INTO students (user_id, level, practice_goal_minutes)
                        VALUES ($1, 'INTERMEDIATE', 30)
                    """, user_id)
                # If user is a teacher, also create teacher record
                elif role == "TEACHER":
                    await conn.execute("""
                        INSERT INTO teachers (user_id, bio, hourly_rate, experience_years)
                        VALUES ($1, 'Experienced music teacher', 75.00, 10)
                    """, user_id)
        
        # Create musical pieces
        print("\n2. Creating musical pieces...")
        pieces = [
            ("Moonlight Sonata", "Ludwig van Beethoven", "Op. 27, No. 2", 7, "#5856D6"),
            ("Für Elise", "Ludwig van Beethoven", "WoO 59", 4, "#007AFF"),
            ("Clair de Lune", "Claude Debussy", "Suite Bergamasque, L. 75", 6, "#34C759"),
            ("Prelude in C Major", "Johann Sebastian Bach", "BWV 846", 5, "#FF9500"),
            ("Nocturne Op. 9 No. 2", "Frédéric Chopin", "Op. 9, No. 2", 6, "#AF52DE"),
            ("Gymnopédie No. 1", "Erik Satie", None, 3, "#00C7BE"),
            ("River Flows in You", "Yiruma", None, 3, "#FF2D55"),
            ("Canon in D", "Johann Pachelbel", None, 4, "#FF3B30"),
        ]
        
        piece_ids = {}
        for name, composer, opus, difficulty, color in pieces:
            # Check if piece exists
            existing = await conn.fetchrow(
                "SELECT id FROM tags WHERE name = $1 AND tag_type = 'piece'", name
            )
            
            if existing:
                piece_ids[name] = existing['id']
                print(f"Piece already exists: {name}")
            else:
                piece_id = await conn.fetchval("""
                    INSERT INTO tags (id, name, composer, opus_number, difficulty_level, color, tag_type)
                    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'piece')
                    RETURNING id
                """, name, composer, opus, difficulty, color)
                piece_ids[name] = piece_id
                print(f"Created piece: {name} by {composer}")
        
        # Assign pieces to users as "currently working on"
        print("\n3. Assigning pieces to users...")
        assignments = [
            # Alice working on 3 pieces
            (user_ids["alice@example.com"], piece_ids["Moonlight Sonata"], 1, "Focus on dynamics in the first movement"),
            (user_ids["alice@example.com"], piece_ids["Für Elise"], 2, "Practice the fast runs"),
            (user_ids["alice@example.com"], piece_ids["Nocturne Op. 9 No. 2"], 3, "Work on phrasing"),
            
            # Bob working on 2 pieces  
            (user_ids["bob@example.com"], piece_ids["Moonlight Sonata"], 1, "Memorize the third movement"),
            (user_ids["bob@example.com"], piece_ids["Clair de Lune"], 2, "Smooth out the arpeggios"),
            
            # Carol working on 4 pieces
            (user_ids["carol@example.com"], piece_ids["Für Elise"], 1, "Get up to tempo"),
            (user_ids["carol@example.com"], piece_ids["Prelude in C Major"], 2, "Even out the sixteenth notes"),
            (user_ids["carol@example.com"], piece_ids["Gymnopédie No. 1"], 3, "Focus on pedaling"),
            (user_ids["carol@example.com"], piece_ids["River Flows in You"], 2, "Add more expression"),
        ]
        
        for user_id, piece_id, priority, notes in assignments:
            # Check if already assigned
            existing = await conn.fetchrow("""
                SELECT user_id FROM user_current_pieces 
                WHERE user_id = $1 AND piece_id = $2
            """, user_id, piece_id)
            
            if not existing:
                started_at = datetime.now(timezone.utc) - timedelta(days=priority * 7)
                await conn.execute("""
                    INSERT INTO user_current_pieces (user_id, piece_id, priority, notes, started_at)
                    VALUES ($1, $2, $3, $4, $5)
                """, user_id, piece_id, priority, notes, started_at)
                
                # Get user and piece names for display
                user_name = await conn.fetchval("SELECT full_name FROM users WHERE id = $1", user_id)
                piece_name = await conn.fetchval("SELECT name FROM tags WHERE id = $1", piece_id)
                print(f"Assigned {piece_name} to {user_name} (Priority {priority})")
        
        # Create some practice sessions
        print("\n4. Creating practice sessions...")
        alice_id = user_ids["alice@example.com"]
        
        # Session 1 - 2 days ago
        session1_id = await conn.fetchval("""
            INSERT INTO practice_sessions (id, student_id, start_time, end_time, self_rating, note, is_synced, primary_piece_tag_id)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, $6)
            RETURNING id
        """, 
            alice_id,
            datetime.now(timezone.utc) - timedelta(days=2, hours=2),
            datetime.now(timezone.utc) - timedelta(days=2, hours=1),
            4,
            "Good progress on the first movement. Working on Moonlight Sonata dynamics",
            piece_ids["Moonlight Sonata"]
        )
        
        # Link session to piece tag
        await conn.execute("""
            INSERT INTO session_tags (session_id, tag_id)
            VALUES ($1, $2)
        """, session1_id, piece_ids["Moonlight Sonata"])
        
        print(f"Created practice session for Alice Chen")
        
        # Session 2 - 1 day ago
        session2_id = await conn.fetchval("""
            INSERT INTO practice_sessions (id, student_id, start_time, end_time, self_rating, note, is_synced, primary_piece_tag_id)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, $6)
            RETURNING id
        """,
            alice_id,
            datetime.now(timezone.utc) - timedelta(days=1, hours=3),
            datetime.now(timezone.utc) - timedelta(days=1, hours=2),
            3,
            "Für Elise speed work. Still need to work on the fast section",
            piece_ids["Für Elise"]
        )
        
        # Link session to piece tag
        await conn.execute("""
            INSERT INTO session_tags (session_id, tag_id)
            VALUES ($1, $2)
        """, session2_id, piece_ids["Für Elise"])
        
        print(f"Created practice session for Alice Chen")
        
        # Create some forum posts
        print("\n5. Creating forum posts...")
        post1_id = await conn.fetchval("""
            INSERT INTO forum_posts (id, author_id, title, content, status, related_piece_id, 
                                   vote_score, comment_count, view_count, created_at, updated_at, last_activity_at)
            VALUES (gen_random_uuid(), $1, $2, $3, 'published', $4, 
                    0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
        """,
            alice_id,
            "Tips for Moonlight Sonata first movement?",
            "I'm struggling with the dynamics in the first movement. Any tips on how to make the melody sing over the arpeggios?",
            piece_ids["Moonlight Sonata"]
        )
        print("Created forum post about Moonlight Sonata")
        
        post2_id = await conn.fetchval("""
            INSERT INTO forum_posts (id, author_id, title, content, status, related_piece_id,
                                   vote_score, comment_count, view_count, created_at, updated_at, last_activity_at)
            VALUES (gen_random_uuid(), $1, $2, $3, 'published', $4,
                    0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
        """,
            user_ids["bob@example.com"],
            "Question about Clair de Lune pedaling",
            "When should I change the pedal in the opening measures? The score isn't very clear.",
            piece_ids["Clair de Lune"]
        )
        print("Created forum post about Clair de Lune")
        
        print("\n" + "=" * 50)
        print("Test data creation complete!")
        print("\nYou can now log in with:")
        print("  Students: alice@example.com, bob@example.com, carol@example.com")
        print("  Teacher: teacher@example.com")
        print("  Password for all: testpass123")
        print("\nPiece statistics:")
        print("  - Moonlight Sonata: 2 users working on it")
        print("  - Für Elise: 2 users working on it")
        print("  - Clair de Lune: 1 user working on it")
        print("  - Other pieces have 1 user each")
        print("\nForum posts:")
        print("  - 2 posts created with piece connections")
        
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(create_test_data())