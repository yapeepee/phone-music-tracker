#!/bin/bash
# Test script for auto-activation of challenges

API_URL="http://localhost:8000/api/v1"
echo "Testing Challenge Auto-Activation System"
echo "======================================="

# 1. Create a new test user
echo -e "\n1. Creating new test student..."
REGISTER_RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "challenge-test@test.com",
    "password": "test123",
    "full_name": "Challenge Test User",
    "role": "student"
  }')

ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.tokens.access_token')
USER_ID=$(echo $REGISTER_RESPONSE | jq -r '.user.id')

if [ "$ACCESS_TOKEN" = "null" ]; then
  echo "Error: Failed to register user"
  echo $REGISTER_RESPONSE
  exit 1
fi

echo "User created successfully. ID: $USER_ID"

# 2. Check if challenges are auto-activated
echo -e "\n2. Checking active challenges..."
ACTIVE_CHALLENGES=$(curl -s -X GET $API_URL/challenges/user/active \
  -H "Authorization: Bearer $ACCESS_TOKEN")

ACTIVE_COUNT=$(echo $ACTIVE_CHALLENGES | jq '. | length')
echo "Active challenges: $ACTIVE_COUNT"

if [ "$ACTIVE_COUNT" -gt 0 ]; then
  echo "✅ SUCCESS: Challenges are auto-activated on registration!"
  echo -e "\nActive challenges:"
  echo $ACTIVE_CHALLENGES | jq '.[].challenge.name'
else
  echo "❌ FAILED: No active challenges found"
fi

# 3. Test login flow
echo -e "\n3. Testing login flow..."
LOGIN_RESPONSE=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "challenge-test@test.com",
    "password": "test123"
  }')

LOGIN_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.tokens.access_token')

# 4. Check challenges after login
echo -e "\n4. Checking challenges after login..."
LOGIN_CHALLENGES=$(curl -s -X GET $API_URL/challenges/user/active \
  -H "Authorization: Bearer $LOGIN_TOKEN")

LOGIN_COUNT=$(echo $LOGIN_CHALLENGES | jq '. | length')
echo "Active challenges after login: $LOGIN_COUNT"

# 5. Get all challenges to see status
echo -e "\n5. Getting all challenges with progress..."
ALL_CHALLENGES=$(curl -s -X GET $API_URL/challenges/ \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Total challenges available: $(echo $ALL_CHALLENGES | jq '.total')"
echo -e "\nChallenge statuses:"
echo $ALL_CHALLENGES | jq '.items[] | {name: .name, status: .user_status, progress: .user_progress}'

echo -e "\n======================================="
echo "Test completed!"