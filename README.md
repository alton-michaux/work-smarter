# Fullstack Resume Analysis Application

This project is a fullstack application designed to ingest user-uploaded resume/task files, analyze them using AI (OpenAI API), and return suggestions via a user-friendly interface. The application is built using a decoupled architecture with a Django backend and a Next.js frontend.

## Project Structure

```
fullstack-app
├── backend                # Django backend service
│   ├── manage.py         # Command-line utility for managing the Django project
│   ├── requirements.txt   # Python packages required for the backend
│   ├── Dockerfile         # Dockerfile for building the backend image
│   ├── .env               # Environment variables for the backend
│   ├── backend            # Django application code
│   ├── api                # Django REST API code
│   └── README.md          # Documentation for the backend service
├── frontend               # Next.js frontend service
│   ├── package.json       # npm configuration file for the frontend
│   ├── next.config.js     # Configuration settings for the Next.js application
│   ├── Dockerfile         # Dockerfile for building the frontend image
│   ├── .env.local         # Environment variables for the frontend
│   ├── public             # Static assets for the frontend
│   ├── pages              # Next.js pages
│   ├── components         # Reusable React components
│   └── README.md          # Documentation for the frontend service
├── db                     # Database directory
│   └── data               # Persistent PostgreSQL database data
├── docker-compose.yml     # Docker Compose configuration for the application
└── README.md              # Overall project documentation
```

## Getting Started

### Prerequisites

- Docker
- Docker Compose

### Setup

1. Clone the repository:
   ```
   git clone <repository-url>
   cd fullstack-app
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
docker-compose exec backend python manage.py test
```

---

### 🐘 PostgreSQL (via Docker)

**Access PostgreSQL shell**

```bash
docker-compose exec db psql -U postgres -d your_db_name
```

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