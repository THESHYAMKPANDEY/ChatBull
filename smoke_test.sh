#!/bin/bash

# Configuration
API_URL="http://localhost:10000"
# Replace with a valid ID token for testing protected routes
# You can get this by logging in via the mobile app or using a Firebase Auth REST script
ID_TOKEN="PLACEHOLDER_TOKEN"

echo "=== ChatBull Smoke Tests ==="

# 1. Health Check
echo "Testing /health..."
curl -s "$API_URL/health" | grep "OK" && echo "✅ Health Check Passed" || echo "❌ Health Check Failed"

if [ "$ID_TOKEN" == "PLACEHOLDER_TOKEN" ]; then
    echo "⚠️  Skipping Authenticated Routes (ID_TOKEN not set)"
    echo "    Please update the ID_TOKEN variable in this script with a valid Firebase ID token to test private mode."
    exit 0
fi

# 2. Start Private Session
echo "Testing /api/private/start..."
SESSION_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $ID_TOKEN" "$API_URL/api/private/start")
echo "Response: $SESSION_RESPONSE"

if echo "$SESSION_RESPONSE" | grep -q "sessionId"; then
    echo "✅ Private Session Started"
    SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)
    echo "   Session ID: $SESSION_ID"
else
    echo "❌ Private Session Start Failed"
    exit 1
fi

# 3. End Private Session
echo "Testing /api/private/end..."
END_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $ID_TOKEN" -H "Content-Type: application/json" -d "{\"sessionId\": \"$SESSION_ID\"}" "$API_URL/api/private/end")
echo "Response: $END_RESPONSE"

if echo "$END_RESPONSE" | grep -q "wipedMessagesCount"; then
    echo "✅ Private Session Ended & Wiped"
else
    echo "❌ Private Session End Failed"
    exit 1
fi

echo "=== Smoke Tests Complete ==="
