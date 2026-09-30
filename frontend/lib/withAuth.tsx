import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAuth } from 'context/AuthContext';

const withAuth = (WrappedComponent: React.FC) => {
  return function ProtectedRoute(props: any) {
    const router = useRouter();
    const { loggedIn, isLoading } = useAuth();

    useEffect(() => {
      // Auth state comes from an httpOnly cookie, checked via a network
      // round-trip on mount (AuthProvider's getUser()) — wait for that to
      // resolve before deciding whether to redirect.
      if (isLoading) return;
      if (!loggedIn) router.push('/');
    }, [isLoading, loggedIn]);

    return <WrappedComponent {...props} />;
  };
};

export default withAuth;
