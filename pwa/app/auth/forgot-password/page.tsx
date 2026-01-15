'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/utils/config';
import { useLanguage } from '@/context/LanguageContext';

export default function ForgotPassword() {
    const { t } = useLanguage();
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                // Map common API errors to localized strings
                const msg = data.message;
                if (msg === 'User not found') throw new Error(t('auth.error.userNotFound'));
                if (msg === 'Failed to send email') throw new Error(t('auth.error.sendEmailFailed'));
                throw new Error(data.message || t('auth.error.generic'));
            }

            setMessage(t('auth.success.resetCodeSent'));
            // Redirect to reset password page after 1.5 seconds so user sees the message
            setTimeout(() => {
                router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`);
            }, 1500);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="login-box">
                <div className="login-logo">
                    <a href="/">
                        <img src="/assets/dist/img/logo.png" alt="Samsara Forge" style={{ height: 300 }} />
                    </a>
                </div>
                <div className="card">
                    <div className="card-body login-card-body">
                        <p className="login-box-msg">{t('auth.forgotPassword.instruction')}</p>

                        {message && <div className="alert alert-success">{message}</div>}
                        {error && <div className="alert alert-danger">{error}</div>}

                        <form onSubmit={handleSubmit}>
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
                            <div className="row">
                                <div className="col-12">
                                    <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                                        {loading ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submit')}
                                    </button>
                                </div>
                            </div>
                        </form>

                        <p className="mt-3 mb-1">
                            <Link href="/auth/login">{t('auth.signIn')}</Link>
                        </p>
                        <p className="mb-0">
                            <Link href="/auth/register" className="text-center">{t('auth.newMembership')}</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
