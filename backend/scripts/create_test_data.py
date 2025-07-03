#!/usr/bin/env python3
"""
Create test data for Music Practice Tracker
This script creates sample pieces, users, and relationships for testing.
"""

import asyncio
import sys
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Add the backend directory to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import engine
from app.models.user import User
from app.models.practice import Tag, PracticeSession, user_current_pieces
from app.core.security import get_password_hash
from sqlalchemy import select, insert
import uuid


async def create_test_users(session: AsyncSession):
    """Create test users"""
    users_data = [
        {
            "email": "alice@example.com",
            "full_name": "Alice Chen",
            "role": "student",
            "hashed_password": get_password_hash("testpass123"),
            "is_active": True,
            "timezone": "America/New_York"
        },
        {
            "email": "bob@example.com", 
            "full_name": "Bob Smith",
            "role": "student",
            "hashed_password": get_password_hash("testpass123"),
            "is_active": True,
            "timezone": "America/Los_Angeles"
        },
        {
            "email": "carol@example.com",
            "full_name": "Carol Johnson",
            "role": "student", 
            "hashed_password": get_password_hash("testpass123"),
            "is_active": True,
            "timezone": "Europe/London"
        },
        {
            "email": "teacher@example.com",
            "full_name": "Dr. David Lee",
            "role": "teacher",
            "hashed_password": get_password_hash("testpass123"),
            "is_active": True,
            "timezone": "America/New_York"
        }
    ]
    
    created_users = []
    for user_data in users_data:
        # Check if user already exists
        result = await session.execute(
            select(User).where(User.email == user_data["email"])
        )
        existing_user = result.scalar_one_or_none()
        
        if not existing_user:
            user = User(**user_data)
            session.add(user)
            created_users.append(user)
            print(f"Created user: {user.full_name} ({user.email})")
        else:
            created_users.append(existing_user)
            print(f"User already exists: {existing_user.full_name}")
    
    await session.commit()
    return created_users


async def create_test_pieces(session: AsyncSession):
    """Create test musical pieces"""
    pieces_data = [
        {
            "name": "Moonlight Sonata",
            "tag_type": "piece",
            "composer": "Ludwig van Beethoven",
            "opus_number": "Op. 27, No. 2",
            "difficulty_level": 7,
            "color": "#5856D6"
        },
        {
            "name": "Für Elise",
            "tag_type": "piece",
            "composer": "Ludwig van Beethoven", 
            "opus_number": "WoO 59",
            "difficulty_level": 4,
            "color": "#007AFF"
        },
        {
            "name": "Clair de Lune",
            "tag_type": "piece",
            "composer": "Claude Debussy",
            "opus_number": "Suite Bergamasque, L. 75",
            "difficulty_level": 6,
            "color": "#34C759"
        },
        {
            "name": "Prelude in C Major",
            "tag_type": "piece",
            "composer": "Johann Sebastian Bach",
            "opus_number": "BWV 846",
            "difficulty_level": 5,
            "color": "#FF9500"
        },
        {
            "name": "Nocturne Op. 9 No. 2",
            "tag_type": "piece",
            "composer": "Frédéric Chopin",
            "opus_number": "Op. 9, No. 2",
            "difficulty_level": 6,
            "color": "#AF52DE"
        },
        {
            "name": "Gymnopédie No. 1",
            "tag_type": "piece",
            "composer": "Erik Satie",
            "difficulty_level": 3,
            "color": "#00C7BE"
        },
        {
            "name": "River Flows in You",
            "tag_type": "piece",
            "composer": "Yiruma",
            "difficulty_level": 3,
            "color": "#FF2D55"
        },
        {
            "name": "Canon in D",
            "tag_type": "piece",
            "composer": "Johann Pachelbel",
            "difficulty_level": 4,
            "color": "#FF3B30"
        }
    ]
    
    created_pieces = []
    for piece_data in pieces_data:
        # Check if piece already exists
        result = await session.execute(
            select(Tag).where(
                Tag.name == piece_data["name"],
                Tag.tag_type == "piece"
            )
        )
        existing_piece = result.scalar_one_or_none()
        
        if not existing_piece:
            piece = Tag(**piece_data)
            session.add(piece)
            created_pieces.append(piece)
            print(f"Created piece: {piece.name} by {piece.composer}")
        else:
            created_pieces.append(existing_piece)
            print(f"Piece already exists: {existing_piece.name}")
    
    await session.commit()
    return created_pieces


async def assign_current_pieces(session: AsyncSession, users, pieces):
    """Assign pieces to users as 'currently working on'"""
    # Define which users are working on which pieces
    assignments = [
        # Alice is working on 3 pieces
        (users[0], pieces[0], 1, "Focus on dynamics in the first movement"),  # Moonlight Sonata
        (users[0], pieces[1], 2, "Practice the fast runs"),  # Für Elise
        (users[0], pieces[4], 3, "Work on phrasing"),  # Nocturne
        
        # Bob is working on 2 pieces
        (users[1], pieces[0], 1, "Memorize the third movement"),  # Moonlight Sonata
        (users[1], pieces[2], 2, "Smooth out the arpeggios"),  # Clair de Lune
        
        # Carol is working on 4 pieces
        (users[2], pieces[1], 1, "Get up to tempo"),  # Für Elise
        (users[2], pieces[3], 2, "Even out the sixteenth notes"),  # Prelude in C
        (users[2], pieces[5], 3, "Focus on pedaling"),  # Gymnopédie
        (users[2], pieces[6], 2, "Add more expression"),  # River Flows in You
    ]
    
    for user, piece, priority, notes in assignments:
        # Check if already assigned
        stmt = select(user_current_pieces).where(
            user_current_pieces.c.user_id == user.id,
            user_current_pieces.c.piece_id == piece.id
        )
        result = await session.execute(stmt)
        
        if not result.first():
            # Add to current pieces
            insert_stmt = insert(user_current_pieces).values(
                user_id=user.id,
                piece_id=piece.id,
                priority=priority,
                notes=notes,
                started_at=datetime.now(timezone.utc) - timedelta(days=priority * 7)
            )
            await session.execute(insert_stmt)
            print(f"Assigned {piece.name} to {user.full_name} (Priority {priority})")
    
    await session.commit()


async def create_practice_sessions(session: AsyncSession, users, pieces):
    """Create some practice sessions for users"""
    # Create sessions for Alice
    alice = users[0]
    sessions_data = [
        {
            "student_id": alice.id,
            "start_time": datetime.now(timezone.utc) - timedelta(days=2, hours=2),
            "end_time": datetime.now(timezone.utc) - timedelta(days=2, hours=1),
            "focus": "Working on Moonlight Sonata dynamics",
            "self_rating": 4,
            "note": "Good progress on the first movement",
            "tags": [pieces[0].id]  # Moonlight Sonata
        },
        {
            "student_id": alice.id,
            "start_time": datetime.now(timezone.utc) - timedelta(days=1, hours=3),
            "end_time": datetime.now(timezone.utc) - timedelta(days=1, hours=2),
            "focus": "Für Elise speed work",
            "self_rating": 3,
            "note": "Still need to work on the fast section",
            "tags": [pieces[1].id]  # Für Elise
        }
    ]
    
    for session_data in sessions_data:
        tags = session_data.pop("tags", [])
        practice_session = PracticeSession(**session_data)
        session.add(practice_session)
        
        # Add tags to session
        for tag_id in tags:
            tag = await session.get(Tag, tag_id)
            if tag:
                practice_session.tags.append(tag)
        
        print(f"Created practice session for {alice.full_name}")
    
    await session.commit()


async def main():
    """Main function to create all test data"""
    print("Creating test data for Music Practice Tracker...")
    print("=" * 50)
    
    async with AsyncSession(engine) as session:
        # Create users
        print("\n1. Creating test users...")
        users = await create_test_users(session)
        
        # Create pieces
        print("\n2. Creating musical pieces...")
        pieces = await create_test_pieces(session)
        
        # Assign current pieces
        print("\n3. Assigning pieces to users...")
        await assign_current_pieces(session, users, pieces)
        
        # Create practice sessions
        print("\n4. Creating practice sessions...")
        await create_practice_sessions(session, users, pieces)
        
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


if __name__ == "__main__":
    asyncio.run(main())