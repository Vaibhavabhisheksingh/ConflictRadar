'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Save JWT token
      localStorage.setItem('token', data.token);

      // Save basic user information
      localStorage.setItem('user', JSON.stringify(data.user));

      alert('Login successful!');

      router.push('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          width: '350px',
          padding: '30px',
          border: '1px solid #ddd',
          borderRadius: '10px',
        }}
      >
        <h1>Login</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: '100%',
            marginBottom: '12px',
            padding: '10px',
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: '100%',
            marginBottom: '12px',
            padding: '10px',
          }}
        />

        {error && (
          <p style={{ color: 'red' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
        <p>
  New to ConflictRadar?{' '}
  <button
    type="button"
    onClick={() => router.push('/signup')}
    style={{
      border: 'none',
      background: 'none',
      padding: 0,
      cursor: 'pointer',
      textDecoration: 'underline',
    }}
  >
    Sign up
  </button>
</p>
      </form>
    </main>
  );
}