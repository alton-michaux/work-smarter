#!/bin/bash
set -e

echo "Checking for pending migrations..."
if (python manage.py showmigrations --plan | grep -q '\[ \]'); then
  echo "Applying pending migrations..."
  python manage.py migrate
else
  echo "No pending migrations found."
fi

# Optional: Collect static files
# echo "Collecting static files..."
# python manage.py collectstatic --noinput

echo "Starting Gunicorn..."
exec "$@"