# 🧪 Practice Partner Matching System - Testing Guide

## 📋 Test Accounts

### Students
- **Alice Chen**: alice@example.com / testpass123
- **Bob Smith**: bob@example.com / testpass123 (Timezone: Europe/London)
- **Carol Johnson**: carol@example.com / testpass123

### Teacher
- **Dr. David Lee**: teacher@example.com / testpass123

## 🎵 Current Pieces Assignment

### Alice Chen is working on:
- Moonlight Sonata
- Für Elise
- Nocturne Op. 9 No. 2
- Gymnopédie No. 1

### Bob Smith is working on:
- Moonlight Sonata
- Clair de Lune

### Carol Johnson is working on:
- Für Elise
- Prelude in C Major
- Gymnopédie No. 1
- River Flows in You

## 🔑 API Base URL
```
http://localhost:8000/api/v1
```

## 📱 Testing Steps

### 1. Login and Get Token
```bash
# Login as Alice
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "testpass123"}'

# Save the access_token from response
```

### 2. Test Practice Partner Discovery

#### 2.1 Discover all compatible partners
```bash
curl -X POST "http://localhost:8000/api/v1/practice-partners/discover" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: List of partners with their pieces

#### 2.2 Filter by specific piece
```bash
# Find partners for Moonlight Sonata (use piece_id from discovery)
curl -X POST "http://localhost:8000/api/v1/practice-partners/discover" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"piece_id": "76888533-0b4e-455c-bc38-b2604c75492a"}'
```

Expected: Only Bob Smith (also working on Moonlight Sonata)

### 3. Test Match Request Creation

#### 3.1 Send a match request
```bash
# Alice sends request to Bob for Moonlight Sonata
curl -X POST "http://localhost:8000/api/v1/practice-partners/matches" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "partner_id": "9e8c5dc1-295d-4583-90b1-a6835fcb9489",
    "piece_id": "76888533-0b4e-455c-bc38-b2604c75492a",
    "requester_message": "Hi Bob! Want to practice Moonlight Sonata together?"
  }'
```

### 4. Test Notifications

#### 4.1 Check Bob's notifications (login as Bob first)
```bash
curl -X GET "http://localhost:8000/api/v1/notifications/?unread_only=true" \
  -H "Authorization: Bearer BOB_TOKEN"
```

Expected: Notification about Alice's request

### 5. Test Match Acceptance

#### 5.1 Bob accepts the match
```bash
# Use match_id from previous response
curl -X PUT "http://localhost:8000/api/v1/practice-partners/matches/MATCH_ID" \
  -H "Authorization: Bearer BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "accepted",
    "partner_message": "Sure Alice! Looking forward to it!"
  }'
```

#### 5.2 Check Alice's notifications for acceptance
```bash
curl -X GET "http://localhost:8000/api/v1/notifications/?unread_only=true" \
  -H "Authorization: Bearer ALICE_TOKEN"
```

### 6. Test Compatible Practice Times

#### 6.1 Get user availability
```bash
curl -X GET "http://localhost:8000/api/v1/practice-partners/availability" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 6.2 Set availability (if needed)
```bash
curl -X POST "http://localhost:8000/api/v1/practice-partners/availability" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "day_of_week": 1,
    "start_time": "18:00",
    "end_time": "20:00",
    "timezone": "America/New_York"
  }'
```

#### 6.3 Find compatible times (for accepted matches)
```bash
curl -X GET "http://localhost:8000/api/v1/practice-partners/matches/MATCH_ID/compatible-times" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 7. Test User Preferences

#### 7.1 Get practice preferences
```bash
curl -X GET "http://localhost:8000/api/v1/practice-partners/preferences" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 7.2 Update preferences
```bash
curl -X PUT "http://localhost:8000/api/v1/practice-partners/preferences" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "is_available_for_partners": true,
    "preferred_communication": "in_app",
    "skill_level": "intermediate",
    "languages": ["English", "Chinese"],
    "max_partners": 3
  }'
```

## 🔍 Current Test Data Status

### Existing Matches:
1. Alice ↔ Bob: Moonlight Sonata (accepted)
2. Alice ↔ Carol: Für Elise (pending)
3. Carol → Alice: Gymnopédie No. 1 (can be tested)

### Availability:
- **Alice**: Mon/Wed/Fri 6-8 PM, Tue 2-5 PM (NY time)
- **Bob**: Tue/Thu 7-9 PM (London time = 2-4 PM NY)
- **Carol**: Every day 4-6 PM (NY time)

### Compatible Times:
- Alice & Bob: Tuesday 2-4 PM (NY) / 7-9 PM (London)

## 📊 Expected Results

### Discovery:
- Users see partners working on same pieces
- Timezone differences calculated correctly
- Existing matches excluded from results

### Notifications:
- Partner receives notification on new request
- Requester receives notification on accept/decline
- Notifications include piece name and messages

### Timezone Conversion:
- Compatible times show in both users' local times
- UTC reference included for accuracy

## 🐛 Troubleshooting

### If no results in discovery:
1. Check both users have the same piece in current_pieces
2. Verify user has is_available_for_partners = true
3. Check no existing match for that piece

### If notifications not appearing:
1. Verify notification types in database:
```sql
SELECT unnest(enum_range(NULL::notificationtype));
```
2. Check notifications table for entries
3. Ensure using unread_only=true parameter

### If compatible times empty:
1. Verify match status is "accepted"
2. Check both users have availability set
3. Look for timezone overlap issues

## 💡 Quick Test Script

Save this as `test_partner_matching.sh`:
```bash
#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Testing Practice Partner Matching System${NC}"

# Login as Alice
echo -e "\n${GREEN}1. Logging in as Alice...${NC}"
ALICE_TOKEN=$(curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "testpass123"}' | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['tokens']['access_token'])")
echo "Token obtained"

# Discover partners
echo -e "\n${GREEN}2. Discovering practice partners...${NC}"
curl -s -X POST "http://localhost:8000/api/v1/practice-partners/discover" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -m json.tool | head -20

# Check notifications
echo -e "\n${GREEN}3. Checking Alice's notifications...${NC}"
curl -s -X GET "http://localhost:8000/api/v1/notifications/?unread_only=true" \
  -H "Authorization: Bearer $ALICE_TOKEN" | python3 -m json.tool

echo -e "\n${BLUE}Test complete!${NC}"
```

Run with: `bash test_partner_matching.sh`