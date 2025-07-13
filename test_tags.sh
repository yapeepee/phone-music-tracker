#!/bin/bash

# Test Tag Management Endpoints

API_URL="http://localhost:8000/api/v1"

# First, get a token (assuming test user exists)
echo "1. Getting auth token..."
TOKEN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "teacher@test.com", "password": "test123"}')

TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to get token. Creating teacher user..."
  curl -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email": "teacher@test.com", "password": "test123", "full_name": "Test Teacher", "role": "teacher"}'
  
  # Try login again
  TOKEN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email": "teacher@test.com", "password": "test123"}')
  
  TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
fi

echo "Token: $TOKEN"

echo -e "\n2. Getting all tags..."
curl -X GET "$API_URL/tags/" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo -e "\n3. Creating a new tag..."
TAG_RESPONSE=$(curl -s -X POST "$API_URL/tags/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Advanced Technique", "color": "#007AFF"}')

echo $TAG_RESPONSE | jq .
TAG_ID=$(echo $TAG_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

echo -e "\n4. Getting popular tags..."
curl -X GET "$API_URL/tags/popular" \
  -H "Authorization: Bearer $TOKEN" | jq .

if [ ! -z "$TAG_ID" ]; then
  echo -e "\n5. Updating the tag..."
  curl -X PUT "$API_URL/tags/$TAG_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"color": "#34C759"}' | jq .
  
  echo -e "\n6. Getting tag usage count..."
  curl -X GET "$API_URL/tags/$TAG_ID/usage-count" \
    -H "Authorization: Bearer $TOKEN" | jq .
fi

echo -e "\nTag management test complete!"