import { AuthProvider } from '../context/AuthContext';
import { ProjectsProvider } from '../context/ProjectsContext';
import { TasksProvider } from '../context/TasksContext';
import { ResumesProvider } from '../context/ResumesContext';
import { APIProvider } from '../context/APIContext';
import { SystemsProvider } from '../context/SystemsContext'
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/footer';
import { Toaster } from 'sonner';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <APIProvider>
        <SystemsProvider>
          <div className="min-h-screen flex flex-col">
            <Navbar />
              <main className="flex-1 min-h-0" >
                <ProjectsProvider>
                  <TasksProvider>
                    <ResumesProvider>
                      <Component {...pageProps} />
                    </ResumesProvider>
                  </TasksProvider>
                </ProjectsProvider>
              </main>
            <Footer />
          </div>
          <Toaster position="bottom-right" richColors />
        </SystemsProvider>
      </APIProvider>
    </AuthProvider>
  );
}

export default MyApp;
