'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      alert('Account created successfully!');

      router.push('/login');
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
        onSubmit={handleSignup}
        style={{
          width: '350px',
          padding: '30px',
          border: '1px solid #ddd',
          borderRadius: '10px',
        }}
      >
        <h1>Create Account</h1>

        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ width: '100%', marginBottom: '12px', padding: '10px' }}
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', marginBottom: '12px', padding: '10px' }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', marginBottom: '12px', padding: '10px' }}
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
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
        <p>
  Already have an account?{' '}
  <button
    type="button"
    onClick={() => router.push('/login')}
    style={{
      border: 'none',
      background: 'none',
      padding: 0,
      cursor: 'pointer',
      textDecoration: 'underline',
    }}
  >
    Login
  </button>
</p>
      </form>
    </main>
  );
}