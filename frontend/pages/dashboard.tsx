import withAuth from '../utils/withAuth';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
    const router = useRouter();
    const { setLoggedIn } = useAuth();

    const handleLogout = async () => {
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
        router.push('/login');
    };

    return (
        <div>
            <h1>Dashboard</h1>
            <p>Welcome to your dashboard! Here you can evaluate your skillsets efficiently.</p>
            <ul>
                <li>
                    <button onClick={handleLogout}>Logout</button>
                </li>
            </ul>
        </div>
    );
}

export default withAuth(Dashboard);