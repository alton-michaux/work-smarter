import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="flex justify-between items-center px-6 py-4 shadow-sm">
      <div className="text-2xl font-bold text-gray-800">Work Smarter</div>
      <div className="space-x-5">
        <Link href="/login" legacyBehavior>
          <a className="text-gray-700 hover:text-green-600">Login</a>
        </Link>
      </div>
    </header>
  );
}