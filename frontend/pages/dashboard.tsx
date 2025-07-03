import withAuth from '../utils/withAuth';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
    const router = useRouter();
    const { setLoggedIn } = useAuth();

    return (
        <div>
            <h1>Dashboard</h1>
            <p>Welcome to your dashboard! Here you can evaluate your skillsets efficiently.</p>
            <ul>
                <li><a href="/logout">Logout</a></li>
            </ul>
        </div>
    );
}

export default withAuth(Dashboard);