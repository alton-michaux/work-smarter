import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Spinner from 'components/shared/Spinner';

const Login = () => {
    const { login, isLoading } = useAuth();
    const [form, setForm] = useState({ username: '', password: '' });
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        login(form)
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Login</h2>

            {isLoading ? (
            <div className="flex justify-center my-8">
                <Spinner />
            </div>
            ) : (
            <form onSubmit={handleLogin} className="space-y-4">
                <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                </label>
                <input
                    type="text"
                    id="username"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                </div>

                <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                </label>
                <input
                    type="password"
                    id="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                </div>

                {error && <p className="text-red-600 text-sm font-medium">{error}</p>}

                <button
                type="submit"
                className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
                >
                Login
                </button>
            </form>
            )}

            <p className="text-sm text-gray-600 mt-4 text-center">
            Don&apos;t have an account?{' '}
            <a href="/register" className="text-green-600 hover:underline">
                Sign up here
            </a>
            </p>

            <div className="text-center mt-2">
            <a href="/" className="text-gray-500 text-sm hover:underline">
                ← Back to Home
            </a>
            </div>
        </div>
        </div>
    );
};

export default Login;