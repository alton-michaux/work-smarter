import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

function Logout() {
    const router = useRouter();
    const { setLoggedIn, logout } = useAuth();

    useEffect(() => {
        const logout_user = async () => {
            logout()
        };
        logout_user();
    }, [setLoggedIn, router]);

    return <p>Logging out...</p>;
}

export default Logout;