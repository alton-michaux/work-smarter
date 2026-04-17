import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Spinner from 'components/shared/Spinner';
import Button from "../components/ui/button";

const Login = () => {
    const { login, isLoading, error } = useAuth();
    const [form, setForm] = useState({ username: '', password: '' });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        login(form)
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow p-8">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">Login</h2>

                {isLoading ? (
                <div className="flex justify-center my-8">
                    <Spinner />
                </div>
                ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Username
                    </label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        value={form.username}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
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
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    </div>

                    {error && (
                    <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-2 rounded text-sm">
                        {error}
                    </div>
                    )}
                    <div className="sticky bottom-0 -mx-6 mt-8 border-t border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur px-6 py-4">
                        <div className="flex items-center justify-around">
                            <Button
                            variant="primary"
                            size="md"
                            type="submit"
                            >
                            Login
                            </Button>
                        </div>
                    </div>
                </form>
                )}

                <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center">
                Don&apos;t have an account?{' '}
                <a href="/register" className="text-green-600 hover:underline">
                    Sign up here
                </a>
                </p>

                <div className="text-center mt-2">
                <a href="/" className="text-gray-500 dark:text-gray-400 text-sm hover:underline">
                    ← Back to Home
                </a>
                </div>
            </div>
        </div>
    )
};

export default Login;