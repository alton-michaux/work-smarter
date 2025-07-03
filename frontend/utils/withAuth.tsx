// utils/withAuth.tsx
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const withAuth = (WrappedComponent: React.FC) => {
  return function ProtectedRoute(props: any) {
    const router = useRouter();

    useEffect(() => {
      const token = localStorage.getItem('accessToken');
      if (!token) router.push('/');
    }, []);

    return <WrappedComponent {...props} />;
  };
};

export default withAuth;
