import { useState } from 'react';
import withAuth from '../utils/withAuth';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TasksContext';

function Dashboard() {
    const router = useRouter();
    const { setLoggedIn } = useAuth();
    const { setTasks } = useTasks();
    const [error, setError] = useState<string | null>(null);

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

    const handleTasks = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tasks/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Token ${token}` }),
                },
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(JSON.stringify(data));
            }

            const data = await res.json();
            setTasks(data); // Store tasks in context
            router.push('/tasks'); // Redirect to tasks page
        } catch (err: any) {
            const msg = err.message.includes('{') ? JSON.parse(err.message) : { error: err.message };
            setError(msg?.detail || msg?.error || 'Failed to fetch tasks');
        }
    }

    return (
        <div>
            <h1>Dashboard</h1>
            <p>Welcome to your dashboard! Here you can evaluate your skillsets efficiently.</p>
            <ul>
                <li>
                    <button onClick={handleTasks}>Tasks</button>
                </li>
                <li>
                    <button onClick={handleLogout}>Logout</button>
                </li>
            </ul>
        </div>
    );
}

export default withAuth(Dashboard);