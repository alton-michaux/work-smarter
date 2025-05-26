# Frontend Documentation

This directory contains the frontend application built with Next.js and React. The frontend communicates with the Django backend via RESTful API endpoints.

## Project Structure

- **public/**: Contains static assets such as images and icons.
- **pages/**: Contains the main pages of the application.
  - **_app.js**: Custom App component for initializing pages and adding global styles.
  - **index.js**: Main entry point for the application, rendering the homepage.
- **components/**: Contains reusable React components.

## Getting Started

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd fullstack-app/frontend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   Create a `.env.local` file in the root of the frontend directory and add the following:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   ```

4. **Run the Development Server**
   ```bash
   npm run dev
   ```

5. **Access the Application**
   Open your browser and navigate to `http://localhost:3000`.

## API Integration

The frontend fetches data from the Django backend using Axios or the Fetch API. Ensure that the backend is running and accessible at the specified API URL.

## Deployment

For production deployment, build the application using:
```bash
npm run build
```
Then, serve the application using a suitable server or deploy it to a platform that supports Next.js.

## Contributing

Feel free to submit issues or pull requests for any improvements or bug fixes.