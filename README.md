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

### Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

### License

This project is licensed under the MIT License. See the LICENSE file for more details.