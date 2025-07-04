import { useAuth } from '../context/AuthContext';
import withAuth from '../utils/withAuth';

const Home = () => {
    const { loggedIn } = useAuth();

    return(
        <div>
            <h1>Work Smarter</h1>
            {loggedIn ? (                
                <>
                    <p>Welcome back! You are logged in. What would you like to do?</p>
                    <ul>
                        <li><a href="/dashboard">Go to Dashboard</a></li>
                        <li><a href="/logout">Logout</a></li>
                    </ul>
                </>
            ) : (
                <>
                    <p>Welcome to the Work Smarter app, where you can evaluate your skillsets efficiently.</p>
                    <p>To get started, please log in or sign up.</p>
                    <p>Use the links below:</p>
                    <ul>
                        <li><a href="/login">Login</a></li>
                        <li><a href="/register">Signup</a></li>
                    </ul>
                    <p>Once logged in, you can access your dashboard to evaluate your skills.</p>
                </>
            )}
        </div>
    )
};

export default withAuth(Home);