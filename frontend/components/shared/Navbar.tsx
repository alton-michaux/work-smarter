import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Button from "../ui/button";

export default function Navbar() {
  const { loggedIn, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => logout();

  return (
    <header className="flex justify-between items-center px-6 py-4 shadow-sm bg-white dark:bg-gray-800 border-b border-transparent dark:border-gray-700">
      <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">Work Smarter</div>
      <div className="flex items-center space-x-4">
        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="rounded-md p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {theme === 'dark' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
        {loggedIn ? (
          <>
            <a href="/" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">Home</a>
            <a href="/settings" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">Settings</a>
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </>
        ) : (
          <Link href="/login" legacyBehavior>
            <a className="text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400">Login</a>
          </Link>
        )}
      </div>
    </header>
  );
}