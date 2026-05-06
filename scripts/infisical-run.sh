#!/bin/bash
set -e

# Infisical Machine Identity credentials (should be set in agent environment)
CLIENT_ID="${INFISICAL_CLIENT_ID}"
CLIENT_SECRET="${INFISICAL_CLIENT_SECRET}"
PROJECT_ID="${INFISICAL_PROJECT_ID:-40d6476c-55e5-4e1b-8079-b251009c6772}"

if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ]; then
  echo "Error: INFISICAL_CLIENT_ID and INFISICAL_CLIENT_SECRET must be set"
  exit 1
fi

# Get short-lived access token via Universal Auth
ACCESS_TOKEN=$(curl -s -X POST 'https://app.infisical.com/api/v1/auth/universal-auth/login' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "clientId=$CLIENT_ID" \
  -d "clientSecret=$CLIENT_SECRET" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

# Run the command with the token
infisical run --token="$ACCESS_TOKEN" --env=dev --projectId="$PROJECT_ID" -- "$@"