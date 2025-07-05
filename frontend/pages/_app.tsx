import { AuthProvider } from '../context/AuthContext';
import { ProjectsProvider } from '../context/ProjectsContext';
import { TasksProvider } from '../context/TasksContext';
// import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <ProjectsProvider>
        <TasksProvider>
          <Component {...pageProps} />
        </TasksProvider>
      </ProjectsProvider>
    </AuthProvider>
  );
}

export default MyApp;