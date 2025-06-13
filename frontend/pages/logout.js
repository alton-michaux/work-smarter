
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

function Logout() {
    const router = useRouter();
    const { setLoggedIn } = useAuth();

    useEffect(() => {
        // Clear authentication state
        setLoggedIn(false);
        // Redirect to home page
        router.push('/');
    }
    , [setLoggedIn, router]);

    return <p>Logging out...</p>;
}

export default Logout;
