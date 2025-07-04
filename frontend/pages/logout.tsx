import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

function Logout() {
    const router = useRouter();
    const { setLoggedIn } = useAuth();

    useEffect(() => {
        const logout = async () => {
            const token = localStorage.getItem('authToken');
            if (token) {
                await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Token ${token}`,
                    },
                });
            }
            localStorage.removeItem('authToken');
            setLoggedIn(false);
            router.push('/');
        };
        logout();
    }, [setLoggedIn, router]);

    return <p>Logging out...</p>;
}

export default Logout;