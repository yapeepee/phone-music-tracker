#!/usr/bin/env python3
"""
Quick test script for API endpoints
Run: python test_api.py
"""
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000/api/v1"

# Test data
test_user = {
    "email": "test.student@example.com",
    "password": "testpass123",
    "full_name": "Test Student",
    "role": "student"
}

test_teacher = {
    "email": "test.teacher@example.com", 
    "password": "testpass123",
    "full_name": "Test Teacher",
    "role": "teacher"
}


def test_auth():
    """Test authentication endpoints"""
    print("\n=== Testing Authentication ===")
    
    # Register student
    print("1. Registering student...")
    response = requests.post(f"{BASE_URL}/auth/register", json=test_user)
    if response.status_code == 200:
        print("✅ Student registered successfully")
        student_data = response.json()
        student_token = student_data["tokens"]["access_token"]
        print(f"   User ID: {student_data['user']['id']}")
    elif response.status_code == 400:
        print("⚠️  Student already exists, trying login...")
        # Login instead
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": test_user["email"],
            "password": test_user["password"]
        })
        if response.status_code == 200:
            print("✅ Student logged in successfully")
            student_data = response.json()
            student_token = student_data["tokens"]["access_token"]
        else:
            print(f"❌ Login failed: {response.json()}")
            return None, None
    else:
        print(f"❌ Registration failed: {response.json()}")
        return None, None
    
    # Register teacher
    print("\n2. Registering teacher...")
    response = requests.post(f"{BASE_URL}/auth/register", json=test_teacher)
    if response.status_code == 200:
        print("✅ Teacher registered successfully")
        teacher_data = response.json()
        teacher_token = teacher_data["tokens"]["access_token"]
    elif response.status_code == 400:
        print("⚠️  Teacher already exists, trying login...")
        # Login instead
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": test_teacher["email"],
            "password": test_teacher["password"]
        })
        if response.status_code == 200:
            print("✅ Teacher logged in successfully")
            teacher_data = response.json()
            teacher_token = teacher_data["tokens"]["access_token"]
        else:
            print(f"❌ Login failed: {response.json()}")
            return student_token, None
    else:
        print(f"❌ Registration failed: {response.json()}")
        return student_token, None
    
    # Test /me endpoint
    print("\n3. Testing /me endpoint...")
    headers = {"Authorization": f"Bearer {student_token}"}
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    if response.status_code == 200:
        print("✅ Current user retrieved successfully")
        print(f"   User: {response.json()['full_name']} ({response.json()['role']})")
    else:
        print(f"❌ Failed to get current user: {response.json()}")
    
    return student_token, teacher_token


def test_practice_sessions(student_token):
    """Test practice session endpoints"""
    print("\n=== Testing Practice Sessions ===")
    
    if not student_token:
        print("❌ No student token available")
        return
    
    headers = {"Authorization": f"Bearer {student_token}"}
    
    # Create a session
    print("1. Creating practice session...")
    session_data = {
        "focus": "technique",
        "start_time": (datetime.now() - timedelta(hours=1)).isoformat(),
        "end_time": datetime.now().isoformat(),
        "self_rating": 4,
        "note": "Practiced scales and arpeggios",
        "tags": ["scales", "arpeggios", "warm-up"]
    }
    
    response = requests.post(
        f"{BASE_URL}/sessions",
        json=session_data,
        headers=headers
    )
    
    if response.status_code == 200:
        print("✅ Session created successfully")
        session = response.json()
        session_id = session["id"]
        print(f"   Session ID: {session_id}")
        print(f"   Duration: {session.get('duration_minutes', 'N/A')} minutes")
    else:
        print(f"❌ Failed to create session: {response.json()}")
        return
    
    # Get sessions
    print("\n2. Getting sessions...")
    response = requests.get(f"{BASE_URL}/sessions", headers=headers)
    
    if response.status_code == 200:
        sessions = response.json()
        print(f"✅ Retrieved {len(sessions)} sessions")
        for s in sessions[:3]:  # Show first 3
            print(f"   - {s['focus']} on {s['start_time'][:10]} (Rating: {s.get('self_rating', 'N/A')})")
    else:
        print(f"❌ Failed to get sessions: {response.json()}")
    
    # Get statistics
    print("\n3. Getting practice statistics...")
    response = requests.get(f"{BASE_URL}/sessions/statistics", headers=headers)
    
    if response.status_code == 200:
        stats = response.json()
        print("✅ Statistics retrieved successfully")
        print(f"   Total sessions: {stats['total_sessions']}")
        print(f"   Total minutes: {stats['total_minutes']}")
        print(f"   Average rating: {stats.get('average_rating', 'N/A')}")
        print(f"   Current streak: {stats['streak_days']} days")
    else:
        print(f"❌ Failed to get statistics: {response.json()}")
    
    # Get specific session
    print(f"\n4. Getting session {session_id}...")
    response = requests.get(f"{BASE_URL}/sessions/{session_id}", headers=headers)
    
    if response.status_code == 200:
        session = response.json()
        print("✅ Session retrieved successfully")
        print(f"   Focus: {session['focus']}")
        print(f"   Tags: {', '.join(t['name'] for t in session.get('tags_details', []))}")
        print(f"   Has video: {session.get('has_video', False)}")
    else:
        print(f"❌ Failed to get session: {response.json()}")


def test_teacher_access(teacher_token, student_token):
    """Test teacher access to student sessions"""
    print("\n=== Testing Teacher Access ===")
    
    if not teacher_token or not student_token:
        print("❌ Missing tokens")
        return
    
    # First, get the student's ID
    headers = {"Authorization": f"Bearer {student_token}"}
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    student_id = response.json()["id"]
    
    # Try to access as teacher (should fail - not assigned)
    print("1. Testing teacher access to unassigned student...")
    headers = {"Authorization": f"Bearer {teacher_token}"}
    response = requests.get(
        f"{BASE_URL}/sessions/students/{student_id}/sessions",
        headers=headers
    )
    
    if response.status_code == 403:
        print("✅ Correctly denied access to unassigned student")
    else:
        print(f"⚠️  Unexpected response: {response.status_code}")


def main():
    """Run all tests"""
    print("🎵 Music Practice Tracker API Test")
    print("=" * 50)
    
    # Test authentication
    student_token, teacher_token = test_auth()
    
    if student_token:
        # Test practice sessions
        test_practice_sessions(student_token)
    
    if student_token and teacher_token:
        # Test teacher access
        test_teacher_access(teacher_token, student_token)
    
    print("\n✅ Tests completed!")


if __name__ == "__main__":
    main()