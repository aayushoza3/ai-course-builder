#!/usr/bin/env bash
set -euo pipefail

# Optional: echo versions for sanity
python -V || true
pip -V || true
celery --version || true

# Start Celery worker in the background.
# We pass broker/result via flags so you don't have to change your celery_app.py.
# If your celery_app.py already reads env, these flags are just harmless.
celery -A app.celery_app.celery_app \
  worker \
  --loglevel=info \
  --concurrency=1 \
  ${CELERY_BROKER_URL:+-b "$CELERY_BROKER_URL"} \
  ${CELERY_RESULT_BACKEND:+--result-backend "$CELERY_RESULT_BACKEND"} &

# Start FastAPI (Uvicorn) in the foreground on the port Render provides.
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
