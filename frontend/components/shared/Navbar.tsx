import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { loggedIn } = useAuth();
  return (
    <header className="flex justify-between items-center px-6 py-4 shadow-sm">
      <div className="text-2xl font-bold text-gray-800">Work Smarter</div>
      <div className="space-x-5">
        {
          loggedIn ? (
            <a href="/">Home</a>
          ) : (
            <Link href="/link" legacyBehavior>
              <a className="text-gray-700 hover:text-green-600">Login</a>
            </Link>
          )};
      </div>
    </header>
  );
}