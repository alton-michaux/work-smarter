import { AuthProvider } from '../context/AuthContext';
import { ProjectsProvider } from '../context/ProjectsContext';
import { TasksProvider } from '../context/TasksContext';
import { APIProvider } from '../context/APIContext';
import { SystemsProvider } from '../context/SystemsContext'
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/footer';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <SystemsProvider>
        <APIProvider>
          <div className="min-h-screen flex flex-col">
            <Navbar />
              <main className="flex-1" >
                <ProjectsProvider>
                  <TasksProvider>
                    <Component {...pageProps} />
                  </TasksProvider>
                </ProjectsProvider>
              </main>
            <Footer />
          </div>
        </APIProvider>
      </SystemsProvider>
    </AuthProvider>
  );
}

export default MyApp;
