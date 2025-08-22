#!/usr/bin/env bash
set -euo pipefail

python -V || true
pip -V || true
celery --version || true

# Celery reads config from env (CELERY_BROKER_URL, CELERY_RESULT_BACKEND)
# so we don't pass broker/backend flags here.
# If your Celery app object path is different, adjust the -A target.
celery -A app.celery_app.celery_app \
  worker \
  --loglevel=info \
  --concurrency="${CELERY_CONCURRENCY:-1}" &

# If you need beat as well (optional, and can add later):
# celery -A app.celery_app.celery_app beat --loglevel=info &

# Start FastAPI on the port Render provides
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-10000}"
