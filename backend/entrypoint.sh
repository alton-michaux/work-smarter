#!/bin/bash
set -e

# Compose starts the db container first but doesn't wait for Postgres to
# accept connections. Wait here, or the first migrate runs too early.
echo "Waiting for the database..."
for attempt in $(seq 1 30); do
  if python manage.py shell -c "from django.db import connection; connection.ensure_connection()" >/dev/null 2>&1; then
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    echo "Database not reachable after 60s." >&2
    exit 1
  fi
  sleep 2
done

# No-op when nothing is pending; a failure stops the container (set -e)
# instead of being read as "no pending migrations".
echo "Applying migrations..."
python manage.py migrate --noinput

# Optional: Collect static files
# echo "Collecting static files..."
# python manage.py collectstatic --noinput

echo "Starting Gunicorn..."
exec "$@"