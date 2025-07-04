import { AuthProvider } from '../context/AuthContext';
import { TasksProvider } from '../context/TasksContext';
// import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <TasksProvider>
        <Component {...pageProps} />
      </TasksProvider>
    </AuthProvider>
  );
}

export default MyApp;