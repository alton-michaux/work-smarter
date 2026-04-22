import { useRouter } from 'next/router';

export default function NotFoundPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">404</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">Page not found</h1>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
            type="button"
          >
            Go back
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
            type="button"
          >
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
