# Backend Service Documentation

This is the backend service of the fullstack application, built using Django and Django REST Framework. The backend is responsible for handling user-uploaded resume/task files, analyzing them with AI, and providing suggestions via a RESTful API.

## Project Structure

- `manage.py`: Command-line utility for managing the Django project.
- `requirements.txt`: Lists the Python packages required for the backend.
- `Dockerfile`: Instructions to build the Docker image for the backend service.
- `.env`: Contains environment variables for the backend, such as database credentials and secret keys.
- `backend/`: Contains the main Django application code.
  - `settings.py`: Django settings, including database configuration and middleware.
  - `urls.py`: URL routing for the Django application.
  - `wsgi.py`: Entry point for WSGI-compatible web servers.
  - `asgi.py`: Entry point for ASGI-compatible web servers.
- `api/`: Contains the API logic.
  - `models.py`: Defines the data models for the application.
  - `serializers.py`: Serializers for converting complex data types to JSON.
  - `views.py`: Views that handle incoming requests and return responses.
  - `urls.py`: URL routing for the API endpoints.

## Setup Instructions

1. **Clone the Repository**
   ```
   git clone <repository-url>
   cd work-smarter/backend
   ```

2. **Build the Docker Image**
   ```
   docker build -t backend .
   ```

3. **Run the Docker Container**
   ```
   docker run --env-file .env -p 8000:8000 backend
   ```

4. **Access the API**
   The API will be available at `http://localhost:8000/api/`.

## CORS Configuration

CORS is enabled to allow requests from the frontend application. Ensure that the frontend's URL is added to the allowed origins in the Django settings.

## API Endpoints

- **Upload Resume/Task**: `POST /api/upload/`
- **Get Suggestions**: `GET /api/suggestions/`

## Development

For local development, ensure that you have Docker and Docker Compose installed. Use the provided `docker-compose.yml` to run both the backend and frontend services together with a shared PostgreSQL database.

## Future Enhancements

- Implement user authentication and authorization.
- Add more AI analysis features.
- Improve error handling and logging.

This documentation provides a basic overview of the backend service. For more detailed information, refer to the individual files and their comments.