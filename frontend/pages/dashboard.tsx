import { useEffect } from 'react';
import withAuth from '../lib/withAuth';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TasksContext';
import { useProjects } from '../context/ProjectsContext'
import { useAPI } from '../context/APIContext'
import { useSystem } from 'context/SystemsContext';

function Dashboard() {
    const router = useRouter();
    const { logout, loggedIn } = useAuth();
    const { fileChange, selectedFile } = useSystem();
    const { fileUpload, uploadStatus } = useAPI();
    const { fetchTasks } = useTasks();
    const { fetchProjects } = useProjects(); 

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        fileChange(file)
    };

    const handleUpload = async () => {
        fileUpload(selectedFile)
    };

    const handleLogout = async () => {
        logout()
    };

    const handleTasks = async (e) => {
        e.preventDefault();
        // fetchTasks()
        router.push('/tasks')
    }

    const handleProjects = async (e) => {
        e.preventDefault();
        // fetchProjects()
        router.push('/projects')
    }

    useEffect(() => {
        fetchTasks()
        fetchProjects()
    }, [loggedIn])

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-10 flex justify-center">
            <div className="w-full max-w-2xl bg-white rounded-lg shadow p-8">
            {/* Heading */}
            <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center">Dashboard</h1>
            <p className="text-gray-600 text-center mb-8">
                Welcome to your dashboard! Here you can evaluate your skillsets efficiently.
            </p>

            {/* Action Buttons */}
            <ul className="grid gap-4 mb-8">
                <li>
                <button
                    onClick={handleProjects}
                    className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
                >
                    Projects
                </button>
                </li>
                <li>
                <button
                    onClick={handleTasks}
                    className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
                >
                    Tasks
                </button>
                </li>
            </ul>

            {/* File Upload Section */}
            <div className="border-t pt-6">
                <label
                htmlFor="file-upload"
                className="block text-sm font-medium text-gray-700 mb-2"
                >
                Upload a <code>.txt</code> file
                </label>
                <input
                id="file-upload"
                type="file"
                accept=".txt"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-700
                    file:mr-4 file:py-2 file:px-4
                    file:rounded file:border-0
                    file:text-sm file:font-semibold
                    file:bg-green-50 file:text-green-700
                    hover:file:bg-green-100"
                />

                <button
                onClick={handleUpload}
                disabled={!selectedFile}
                className={`mt-4 w-full py-2 rounded text-white font-medium transition ${
                    selectedFile
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-blue-300 cursor-not-allowed'
                }`}
                >
                Upload File
                </button>

                {uploadStatus && (
                <p className="mt-2 text-sm text-gray-600 text-center">{uploadStatus}</p>
                )}
            </div>

            {/* Logout Button */}
            <div className="mt-8 border-t pt-6 text-center">
                <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-800 text-sm font-medium transition"
                >
                Log out
                </button>
            </div>
            </div>
        </div>
    );
}

export default withAuth(Dashboard);