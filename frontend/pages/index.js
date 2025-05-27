import Login from './login'
import Signup from './signup';

const Home = () => {
    return(
        <div>
            <h1>Work Smarter</h1>

            <p>Welcome to the Work Smarter app, where you can evaluate your skillsets efficiently.</p>
            <p>To get started, please log in or sign up.</p>
            <p>Use the links below:</p>
            <ul>
                <li><a href="/login">Login</a></li>
                <li><a href="/signup">Signup</a></li>
            </ul>
            <p>Once logged in, you can access your dashboard to evaluate your skills.</p>
        </div>
    )
};

export default Home;