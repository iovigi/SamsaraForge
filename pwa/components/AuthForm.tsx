'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../context/LanguageContext';

import { API_BASE_URL } from '../utils/config';

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
    const { t } = useLanguage();
    const [nickname, setNickname] = useState('');
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
            if (password.length < 6) {
                setError(t('auth.passwordTooShort') || 'Password must be at least 6 characters');
                return;
            }
            if (password !== confirmPassword) {
                setError(t('auth.passwordMismatch'));
                return;
            }
            if (!acceptTerms) {
                setError(t('auth.termsError'));
                return;
            }
            if (!acceptGdpr) {
                setError(t('auth.gdprError'));
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
                body: JSON.stringify({ email, password, nickname }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Something went wrong');
            }

            if (mode === 'login') {
                localStorage.setItem('token', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                localStorage.setItem('userEmail', email); // Store email
                // alert('Login Successful!'); // Removed as per request
                router.push('/dashboard');
            } else {
                // Register success handling - Auto Login
                if (data.accessToken) {
                    localStorage.setItem('token', data.accessToken);
                    localStorage.setItem('refreshToken', data.refreshToken);
                    localStorage.setItem('userEmail', email); // Store email
                    // alert('Registration Successful! Logging you in...');
                    router.push('/dashboard');
                } else {
                    // Fallback if no token (shouldn't happen with new API)
                    // alert('Registration Successful! Please login.');
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
                <p className="login-box-msg">{mode === 'login' ? t('auth.login.title') : t('auth.register.title')}</p>

                {error && <div className="alert alert-danger">{error}</div>}

                <form onSubmit={handleSubmit}>
                    {mode === 'register' && (
                        <div className="input-group mb-3">
                            <input
                                type="text"
                                className="form-control"
                                placeholder={t('auth.nickname')}
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                            />
                            <div className="input-group-append">
                                <div className="input-group-text">
                                    <span className="fas fa-user"></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="input-group mb-3">
                        <input
                            type="email"
                            className="form-control"
                            placeholder={t('auth.email')}
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
                            placeholder={t('auth.password')}
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
                                    placeholder={t('auth.confirmPassword')}
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
                                            {t('auth.agreeTerms')} <a href="/terms" target="_blank">{t('auth.terms')}</a>
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
                                            {t('auth.confirmGdpr')} <a href="/privacy" target="_blank">{t('auth.gdpr')}</a>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="row">
                        <div className="col-12">
                            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                                {loading ? t('auth.processing') : (mode === 'login' ? t('auth.signIn') : t('auth.register'))}
                            </button>
                        </div>
                    </div>
                </form>

                {mode === 'login' && (
                    <p className="mb-1 mt-3">
                        <a href="/auth/forgot-password">{t('auth.forgotPassword')}</a>
                    </p>
                )}

                <p className="mb-0 mt-1">
                    {mode === 'login' ? (
                        <a href="/auth/register" className="text-center">{t('auth.newMembership')}</a>
                    ) : (
                        <a href="/auth/login" className="text-center">{t('auth.hasMembership')}</a>
                    )}
                </p>
            </div>
        </div>
    );
}
