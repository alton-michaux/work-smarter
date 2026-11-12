# Fullstack Resume Analysis Application

This project is a fullstack application designed to ingest user-uploaded resume/task files, analyze them using AI (OpenAI API), and return suggestions via a user-friendly interface. The application is built using a decoupled architecture with a Django backend and a Next.js frontend.

## Project Structure

```
work-smarter
├── backend                # Django backend service
│   ├── manage.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env
│   ├── backend            # Django project code
│   ├── api                # Django REST API code
│   └── README.md
├── frontend               # Next.js frontend service
│   ├── package.json
│   ├── next.config.js
│   ├── Dockerfile
│   ├── .env.local
│   ├── public
│   ├── pages
│   ├── components
│   └── README.md
├── db                     # Database directory
│   └── data               # Persistent PostgreSQL data
├── docker-compose.yml     # Docker Compose configuration
└── README.md              # Project documentation
```

## Getting Started

### Prerequisites

- Docker
- Docker Compose

### Setup

1. Clone the repository:
   ```
   git clone <repository-url>
   cd work-smarter
   ```

2. Create a `.env` file in the `backend` directory and a `.env.local` file in the `frontend` directory with the necessary environment variables.

3. Build and run the application using Docker Compose:
   ```
   docker-compose up --build
   ```

### Usage

- The backend service will be available at `http://localhost:8000`.
- The frontend service will be available at `http://localhost:3000`.

### API Endpoints

The backend exposes RESTful endpoints for uploading resumes and retrieving suggestions. Refer to the backend README for detailed API documentation.

## 🛠️ Useful Commands (Docker, Django, etc.)

### 🐳 Docker & Docker Compose

**Start all services**

```bash
docker-compose up --build
```

**Start services in the background**

```bash
docker-compose up -d
```

**Stop all services**

```bash
docker-compose down
```

**Rebuild containers without cache**

```bash
docker-compose build --no-cache
```

**Run a one-off command inside a running container**

```bash
docker-compose exec backend bash        # Open shell in backend  
docker-compose exec frontend sh         # Open shell in frontend
```

**View container logs**

```bash
docker-compose logs -f backend
```

---

### 🐍 Django (Backend)

**Run development server (non-Docker)**

```bash
python manage.py runserver
```

**Run migrations**

```bash
docker-compose exec backend python manage.py migrate
```

**Create superuser**

```bash
docker-compose exec backend python manage.py createsuperuser
```

**Open Django shell**

```bash
docker-compose exec backend python manage.py shell
```

**Run tests**

```bash
docker-compose exec backend pytest --cov=backend || pytest
```

---

### 🌱 Demo Data (local only)

**Build a demo account full of test data**

```bash
docker-compose exec backend python manage.py seed_demo_account          # create or rebuild
docker-compose exec backend python manage.py seed_demo_account --clear  # delete it
```

This creates a separate login, so it never mixes with real accounts. Re-running
deletes the account and rebuilds it from scratch; log in again afterwards. It
refuses to run with `DEBUG` off unless you pass `--force`.

| What | Value |
| --- | --- |
| Email | `demo@worksmarter.test` |
| Password | `demo-pass-1234` |
| Encrypted-note passphrase | `demo-passphrase` |
| API keys | Printed by the command each run; only hashes are stored, so copy them then |

What's in it:

- **Projects:** 5, including a completed one, two with near-identical colors, and one with 120+ tasks (more than a 50-row page)
- **Daily log:** subtasks stored out of position order, three-level nesting, a 15-item checklist, carry-overs from 1–160 days ago, overdue/today/upcoming deadlines, long and HTML/emoji titles, overlapping evening meetings with agenda items
- **Recurring:** every frequency, skip-weekends, skip exceptions, and an ended series
- **Notes:** markdown, plain, very long, and two encrypted
- **Timeline:** six months of completed work across projects
- **API keys:** read-only, read/write, and a never-used key
- **Resume:** a profile (experience, education, skills) and an uploaded PDF

Try an API key:

```bash
curl -H "Authorization: Api-Key <key from the command output>" \
  "http://localhost:8000/api/v1/tasks/?is_done=false"
```

For a single day of daily-log data on an existing account, use
`seed_daily_log_demo` instead (`--user`, `--date`, `--clear`).

---

### 🐘 PostgreSQL (via Docker)

**Access PostgreSQL shell**

```bash
docker-compose exec db psql -U postgres -d your_db_name
```

---

### 💾 Database backups

`.github/workflows/backup.yml` runs `bin/db-export` against production every day, encrypts
the result with [age](https://github.com/FiloSottile/age) and keeps it as a workflow artifact
for 30 days. Each backup holds `db.dump` (`pg_dump` custom format) and `counts.txt` (rows per
table). The scripts run Postgres tools in `postgres:<major>-alpine` containers, so they only
need Docker (plus `age` to decrypt).

One-time setup:

1. Repo secret `DATABASE_URL` = the production connection string (on Neon, the *direct*
   one, without `-pooler` in the host).
2. Repo variable `BACKUP_AGE_RECIPIENT` = an age public key (`age-keygen -o ~/.config/age/work-smarter.txt`
   prints it). Keep the private key somewhere that outlives this machine: without it the
   backups can't be opened.
3. *Actions → Back up database → Run workflow* once to check it.

Restore (or move the database to a new host):

```bash
gh run download <run id> -n work-smarter-<timestamp>
TARGET_DATABASE_URL='<target direct URL>' bin/db-import work-smarter-<timestamp>.tar.age
```

`bin/db-import` replaces the backup's tables in the target in one transaction, then checks
row counts against `counts.txt` and warns about unapplied migrations. To move hosts without
waiting for the workflow, export straight from the old database:
`SOURCE_DATABASE_URL='<old URL>' bin/db-export`, then import the `backups/work-smarter-*`
directory it prints.

---

### 🧪 Debugging / Python

**Use `pdb` in code**

```python
import pdb; pdb.set_trace()
```

**Validate model manually**

```python
obj.full_clean()  # raises ValidationError if invalid  
obj.__dict__      # inspect model fields
```

---

### ⚙️ Docker Tips

**Check Docker socket permissions (WSL)**

```bash
ls -l /var/run/docker.sock
```

**Add user to docker group (in WSL/Linux)**

```bash
sudo usermod -aG docker $USER  
newgrp docker
```

**Check for memory issues**

```bash
dmesg | grep -i oom
```

### Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

### License

This project is licensed under the MIT License. See the LICENSE file for more details.