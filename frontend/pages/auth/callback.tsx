import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';
import Spinner from 'components/shared/Spinner';

export default function AuthCallback() {
  const router = useRouter();
  const { getUser } = useAuth();

  useEffect(() => {
    if (!router.isReady) return;

    // The backend sets httpOnly auth cookies directly on the redirect to
    // this page — no token is passed in the URL. getUser() reports failure
    // via context state (not a rejected promise), so unconditionally head
    // to /dashboard; withAuth bounces back to /login if the session didn't
    // actually get established.
    getUser().finally(() => router.replace('/dashboard'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Spinner />
    </div>
  );
}
