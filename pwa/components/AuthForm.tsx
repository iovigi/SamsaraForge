'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { API_BASE_URL } from '../utils/config';

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [acceptGdpr, setAcceptGdpr] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Client-side validation
        if (mode === 'register') {
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }
            if (!acceptTerms) {
                setError('You must accept the Terms & Conditions');
                return;
            }
            if (!acceptGdpr) {
                setError('You must confirm that you have read the GDPR Policy');
                return;
            }
        }

        setLoading(true);

        const endpoint = mode === 'login' ? `${API_BASE_URL}/api/auth/login` : `${API_BASE_URL}/api/auth/register`;

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
                localStorage.setItem('token', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                alert('Login Successful!');
                router.push('/kanban');
            } else {
                // Register success handling - Auto Login
                if (data.accessToken) {
                    localStorage.setItem('token', data.accessToken);
                    localStorage.setItem('refreshToken', data.refreshToken);
                    alert('Registration Successful! Logging you in...');
                    router.push('/kanban');
                } else {
                    // Fallback if no token (shouldn't happen with new API)
                    alert('Registration Successful! Please login.');
                    router.push('/auth/login');
                }
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

                    {mode === 'register' && (
                        <>
                            <div className="input-group mb-3">
                                <input
                                    type="password"
                                    className="form-control"
                                    placeholder="Retype password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                                <div className="input-group-append">
                                    <div className="input-group-text">
                                        <span className="fas fa-lock"></span>
                                    </div>
                                </div>
                            </div>
                            <div className="row mb-2">
                                <div className="col-12">
                                    <div className="icheck-primary">
                                        <input
                                            type="checkbox"
                                            id="agreeTerms"
                                            checked={acceptTerms}
                                            onChange={(e) => setAcceptTerms(e.target.checked)}
                                        />
                                        <label htmlFor="agreeTerms">
                                            I agree to the <a href="/terms" target="_blank">terms</a>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="row mb-3">
                                <div className="col-12">
                                    <div className="icheck-primary">
                                        <input
                                            type="checkbox"
                                            id="agreeGdpr"
                                            checked={acceptGdpr}
                                            onChange={(e) => setAcceptGdpr(e.target.checked)}
                                        />
                                        <label htmlFor="agreeGdpr">
                                            I confirm I have read the <a href="/privacy" target="_blank">GDPR Policy</a>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="row">
                        <div className="col-12">
                            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                                {loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Register')}
                            </button>
                        </div>
                    </div>
                </form>

                {mode === 'login' && (
                    <p className="mb-1 mt-3">
                        <a href="/auth/forgot-password">I forgot my password</a>
                    </p>
                )}

                <p className="mb-0 mt-1">
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
