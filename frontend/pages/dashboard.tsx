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
        <div>
            <h1>Dashboard</h1>
            <p>Welcome to your dashboard! Here you can evaluate your skillsets efficiently.</p>
            <ul>
                <li>
                    <button onClick={handleProjects}>Projects</button>
                </li>
                <li>
                    <button onClick={handleTasks}>Tasks</button>
                </li>
                <li>
                    <button onClick={handleLogout}>Logout</button>
                </li>
            </ul>
            <div className="p-4">
                <input
                    type="file"
                    accept=".txt" // later: ".txt,.csv"
                    onChange={handleFileChange}
                    className="mb-2"
                />
                <button
                    onClick={handleUpload}
                    disabled={!selectedFile}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    Upload File
                </button>
                {uploadStatus && <p className="mt-2 text-sm">{uploadStatus}</p>}
            </div>
        </div>
    );
}

export default withAuth(Dashboard);