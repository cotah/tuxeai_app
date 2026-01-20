#!/bin/bash

# Script to add environment variables to Render Web Service
# Usage: ./setup-render-env.sh <service_id> <api_key>

SERVICE_ID="${1:-srv-d5njc6t4tr6s73d8ofkg}"
API_KEY="$2"

if [ -z "$API_KEY" ]; then
  echo "Usage: ./setup-render-env.sh <service_id> <api_key>"
  echo "Get your API key from: https://dashboard.render.com/account/settings"
  exit 1
fi

# Render API endpoint
API_URL="https://api.render.com/v1/services/$SERVICE_ID/env-vars"

# Environment variables to add
cat << 'EOF' | jq -c '.[] | {key, value}' | while read -r env_var; do
  echo "Adding: $(echo "$env_var" | jq -r '.key')"
  curl -X PUT "$API_URL" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "[$env_var]"
  echo ""
done

[
  {
    "key": "DATABASE_URL",
    "value": "postgresql://app_user:7ttOZBS0mEEGhO9bep18bYRfhLjpWA4i@dpg-d5njbkmr433s739pk2dg-a.frankfurt-postgres.render.com/restaurant_platform_r1dp"
  },
  {
    "key": "JWT_SECRET",
    "value": "tuxeai-super-secret-jwt-key-2026-change-in-production"
  },
  {
    "key": "OAUTH_SERVER_URL",
    "value": "https://api.manus.im"
  },
  {
    "key": "VITE_OAUTH_PORTAL_URL",
    "value": "https://manus.im/oauth"
  },
  {
    "key": "VITE_APP_ID",
    "value": "tuxeai_app"
  },
  {
    "key": "OWNER_OPEN_ID",
    "value": "owner_default"
  },
  {
    "key": "OWNER_NAME",
    "value": "Admin"
  },
  {
    "key": "VITE_APP_TITLE",
    "value": "Restaurant AI Workforce"
  },
  {
    "key": "NODE_ENV",
    "value": "production"
  }
]
EOF

echo "✅ Environment variables added successfully!"
echo "Now trigger a redeploy in Render dashboard."
