import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import Button from "../ui/button"; // Add this import

export default function Navbar() {
  const { loggedIn, logout } = useAuth();

  const handleLogout = () => {
    logout()
  }

  return (
    <header className="flex justify-between items-center px-6 py-4 shadow-sm">
      <div className="text-2xl font-bold text-gray-800">Work Smarter</div>
      <div className="space-x-5">
        {
          loggedIn ? (
            <>
              <a href="/">Home</a>
              <a href="/settings" className="text-gray-700 hover:text-blue-600">Settings</a>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <Link href="/login" legacyBehavior>
              <a className="text-gray-700 hover:text-green-600">Login</a>
            </Link>
          )}
      </div>
    </header>
  );
}