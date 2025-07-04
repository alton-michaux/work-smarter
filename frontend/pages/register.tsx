import { useState } from 'react';
import { useRouter } from 'next/router';

const Register = () => {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password1: '',
    password2: '',
  });
  
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/registration/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(JSON.stringify(data));
      }

      // ✅ Registered! Redirect to login or dashboard
      router.push('/login');
    } catch (err: any) {
      const msg = err.message.includes('{') ? JSON.parse(err.message) : { error: err.message };
      setError(msg?.non_field_errors?.[0] || msg?.password1?.[0] || msg?.error || 'Registration failed');
    }
  };

  return (
    <div>
      <h1>Register</h1>
      <form onSubmit={handleSubmit}>
        <input name="username" placeholder="Username" onChange={handleChange} required />
        <input name="email" placeholder="Email" type="email" onChange={handleChange} required />
        <input name="password1" placeholder="Password" type="password" onChange={handleChange} required />
        <input name="password2" placeholder="Confirm Password" type="password" onChange={handleChange} required />
        <button type="submit">Register</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default Register