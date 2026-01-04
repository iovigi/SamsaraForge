'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const endpoint = mode === 'login' ? 'http://localhost:3000/api/auth/login' : 'http://localhost:3000/api/auth/register';

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Something went wrong');
            }

            if (mode === 'login') {
                localStorage.setItem('token', data.token);
                // Redirect to dashboard or home (placeholder)
                alert('Login Successful!');
                router.push('/');
            } else {
                alert('Registration Successful! Please login.');
                router.push('/auth/login');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <div className="card-body login-card-body">
                <p className="login-box-msg">{mode === 'login' ? 'Sign in to start your session' : 'Register a new membership'}</p>

                {error && <div className="alert alert-danger">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group mb-3">
                        <input
                            type="email"
                            className="form-control"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <div className="input-group-append">
                            <div className="input-group-text">
                                <span className="fas fa-envelope"></span>
                            </div>
                        </div>
                    </div>
                    <div className="input-group mb-3">
                        <input
                            type="password"
                            className="form-control"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <div className="input-group-append">
                            <div className="input-group-text">
                                <span className="fas fa-lock"></span>
                            </div>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-12">
                            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                                {loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Register')}
                            </button>
                        </div>
                    </div>
                </form>

                <p className="mb-0 mt-3">
                    {mode === 'login' ? (
                        <a href="/auth/register" className="text-center">Register a new membership</a>
                    ) : (
                        <a href="/auth/login" className="text-center">I already have a membership</a>
                    )}
                </p>
            </div>
        </div>
    );
}
