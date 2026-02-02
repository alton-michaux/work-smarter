import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

function Logout() {
    // const router = useRouter();
    const { setLoggedIn, logout, error } = useAuth();

    // useEffect(() => {
    //     const logout_user = async () => {
    //         logout()
    //     };
    //     logout_user();
    // }, [setLoggedIn, router]);

    return (
        <div>
            <p>Logging out...</p>
            {error && (
                <p className="text-red-600 text-sm font-medium">{error}</p>
            )}
        </div>
    );
}

export default Logout;