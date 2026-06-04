#!/usr/bin/env bash
set -euo pipefail

JOB_PATH="${1:-}"
MODE="${2:-required}"

if [[ -z "$JOB_PATH" ]]; then
  echo "Usage: scripts/call-job-endpoint.sh /api/jobs/job-name [required|optional]"
  exit 2
fi

if [[ -z "${APP_URL:-}" ]]; then
  echo "APP_URL is required."
  exit 2
fi

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "CRON_SECRET is required."
  exit 2
fi

BASE_URL="${APP_URL%/}"
URL="${BASE_URL}${JOB_PATH}"

echo "Calling ${JOB_PATH}"
set +e
RESPONSE="$(curl -sS -X POST "$URL" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  --max-time 300 \
  --fail-with-body 2>&1)"
STATUS=$?
set -e

echo "$RESPONSE"

if [[ "$STATUS" -ne 0 ]]; then
  if [[ "$MODE" == "optional" ]]; then
    echo "Optional job failed but will not fail workflow: ${JOB_PATH}"
    exit 0
  fi
  echo "Required job failed: ${JOB_PATH}"
  exit "$STATUS"
fi

echo "Completed ${JOB_PATH}"
