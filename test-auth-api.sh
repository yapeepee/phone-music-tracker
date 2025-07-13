#!/bin/bash

# Test the auth API directly to verify the response structure
echo "Testing auth API..."
echo ""

# Test login endpoint
echo "Testing login endpoint..."
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "testpass123"
  }' | python3 -m json.tool

echo ""
echo "If the above shows access_token, refresh_token, and token_type in the tokens object,"
echo "then the API is working correctly and the frontend transformation should work."