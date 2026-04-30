import Head from 'next/head';
import { AuthProvider } from '../context/AuthContext';
import { ProjectsProvider } from '../context/ProjectsContext';
import { TasksProvider } from '../context/TasksContext';
import { ResumesProvider } from '../context/ResumesContext';
import { APIProvider } from '../context/APIContext';
import { SystemsProvider } from '../context/SystemsContext'
import { ThemeProvider } from '../context/ThemeContext';
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/footer';
import { Toaster } from 'sonner';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <>
    <Head>
      <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    </Head>
    <ThemeProvider>
      <AuthProvider>
        <APIProvider>
          <SystemsProvider>
            <div className="h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors duration-200 overflow-hidden">
              <Navbar />
                <main className="flex-1 min-h-0 overflow-y-auto">
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
    </ThemeProvider>
    </>
  );
}

export default MyApp;
