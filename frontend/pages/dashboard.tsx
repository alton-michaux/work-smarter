import { useState } from 'react';
import withAuth from '../utils/withAuth';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TasksContext';
import { useProjects } from '../context/ProjectsContext'

function Dashboard() {
    const router = useRouter();
    const { setLoggedIn, logout } = useAuth();
    const { fetchTasks } = useTasks();
    const { fetchProjects } = useProjects();
    const [error, setError] = useState<string | null>(null);    
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadStatus, setUploadStatus] = useState('');

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
        // Only allow txt for now
        const validTypes = ['text/plain']; // later add 'text/csv' for CSV
        if (validTypes.includes(file.type)) {
            setSelectedFile(file);
            setUploadStatus('');
        } else {
            setUploadStatus('Invalid file type. Please upload a .txt file.');
        }
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        const token = localStorage.getItem('authToken');
        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/import/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (res.ok) {
            setUploadStatus('Upload successful!');
        } else {
            setUploadStatus('Upload failed.');
        }
        } catch (error) {
        setUploadStatus('An error occurred during upload.');
        }
    };

    const handleLogout = async () => {
        logout()
    };

    const handleTasks = async (e) => {
        e.preventDefault();
        fetchTasks()
        router.push('/tasks')
    }

    const handleProjects = async (e) => {
        e.preventDefault();
        fetchProjects()
        router.push('/projects')
    }

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-10 flex justify-center">
        <div className="w-full max-w-2xl bg-white rounded-lg shadow p-8">
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
            <li>
                <button
                onClick={handleLogout}
                className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 transition"
                >
                Logout
                </button>
            </li>
            </ul>

            {/* File Upload */}
            <div className="border-t pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload a .txt file</label>
            <input
                type="file"
                accept=".txt"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4
                        file:rounded file:border-0 file:text-sm file:font-semibold
                        file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
            <button
                onClick={handleUpload}
                disabled={!selectedFile}
                className={`mt-4 w-full py-2 rounded text-white transition ${
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
        </div>
        </div>
    );
}

export default withAuth(Dashboard);