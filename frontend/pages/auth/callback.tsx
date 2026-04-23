import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';
import Spinner from 'components/shared/Spinner';

export default function AuthCallback() {
  const router = useRouter();
  const { loginWithToken } = useAuth();

  useEffect(() => {
    if (!router.isReady) return;

    const { access } = router.query;
    if (!access || typeof access !== 'string') {
      router.replace('/login?error=auth_failed');
      return;
    }

    loginWithToken(access)
      .then(() => router.replace('/dashboard'))
      .catch(() => router.replace('/login?error=auth_failed'));
  }, [router.isReady, router.query]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Spinner />
    </div>
  );
}
