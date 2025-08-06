import { AuthProvider } from '../context/AuthContext';
import { ProjectsProvider } from '../context/ProjectsContext';
import { TasksProvider } from '../context/TasksContext';
import { APIProvider } from '../context/APIContext';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <APIProvider>
        <ProjectsProvider>
          <TasksProvider>
            <Component {...pageProps} />
          </TasksProvider>
        </ProjectsProvider>
      </APIProvider>
    </AuthProvider>
  );
}

export default MyApp;
