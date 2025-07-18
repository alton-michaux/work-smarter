import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const router = useRouter();
    const { loggedIn, setLoggedIn } = useAuth();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(JSON.stringify(data));
            }

            const data = await res.json();
            // Save token to localStorage (or sessionStorage)
            if (data.key) {
                localStorage.setItem('authToken', data.key);
            }

            setLoggedIn(true);
            router.push('/dashboard');
        } catch (err: any) {
            const msg = err.message.includes('{') ? JSON.parse(err.message) : { error: err.message };
            setError(msg?.non_field_errors?.[0] || msg?.error || 'Login failed');
        }
    };

    return (
        <div>
            <h2>Login</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="email">email:</label>
                    <input
                        type="text"
                        id="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        required
                    />
                </div>
                <button type="submit">Login</button>
            </form>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <p>Don't have an account? <a href="/register">Sign up here</a>.</p>
            <a href="/">Back to Home</a>
        </div>
    );
};

export default Login;