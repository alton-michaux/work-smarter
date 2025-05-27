// Authentication - Login
export default function Login() {
    return (
        <div>
            <h2>Login</h2>
            <form>
                <div>
                    <label htmlFor="username">Username:</label>
                    <input type="text" id="username" name="username" required />
                </div>
                <div>
                    <label htmlFor="password">Password:</label>
                    <input type="password" id="password" name="password" required />
                </div>
                <button type="submit">Login</button>
            </form> 

            <p>Don't have an account? <a href="/signup">Sign up here</a>.</p>
            <a href="/">Back to Home</a>
        </div>
    )
}