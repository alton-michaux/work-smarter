import { AuthProvider } from '../context/AuthContext';
import { ProjectsProvider } from '../context/ProjectsContext';
import { TasksProvider } from '../context/TasksContext';
import { APIProvider } from '../context/APIContext';
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/footer';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <APIProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
            <ProjectsProvider>
              <TasksProvider>
                <Component {...pageProps} />
              </TasksProvider>
            </ProjectsProvider>
          <Footer />
        </div>
      </APIProvider>
    </AuthProvider>
  );
}

export default MyApp;
