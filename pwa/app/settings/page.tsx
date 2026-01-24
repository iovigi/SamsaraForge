'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { useModal } from '../../context/ModalContext';
import { usePushSubscription } from '../../hooks/usePushSubscription';
import { authenticatedFetch } from '../../utils/api';
import { API_BASE_URL } from '../../utils/config';

export default function SettingsPage() {
    const { language, setLanguage, t } = useLanguage();
    const { isSubscribed, subscribe, unsubscribe, loading, error: pushError } = usePushSubscription();

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Profile state
    const [nickname, setNickname] = useState('');
    const [quoteNotifications, setQuoteNotifications] = useState(false);
    const [quoteNotificationIntervalMin, setQuoteNotificationIntervalMin] = useState(1440);
    const [emailNotifications, setEmailNotifications] = useState(false);
    const [emailQuoteNotifications, setEmailQuoteNotifications] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await authenticatedFetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    const user = data.user;
                    setNickname(user.nickname || '');
                    setQuoteNotifications(user.quoteNotifications || false);
                    setQuoteNotificationIntervalMin(user.quoteNotificationIntervalMin || 1440);
                    setEmailNotifications(user.emailNotifications || false);
                    setEmailQuoteNotifications(user.emailQuoteNotifications || false);
                    if (user.language) setLanguage(user.language);
                }
            } catch (error) {
                console.error('Failed to fetch profile', error);
            }
        };
        fetchProfile();
    }, [setLanguage]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault(); // Just in case, though usually called by button type="button" in previous logic. 
        // In this form, we make it a proper onSubmit or button click.
        setIsLoading(true);
        setMessage(null);

        try {
            const res = await authenticatedFetch('/api/auth/me', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    nickname,
                    quoteNotifications,
                    quoteNotificationIntervalMin: Number(quoteNotificationIntervalMin),
                    emailNotifications,
                    emailQuoteNotifications,
                    language
                }),
            });

            if (res.ok) {
                setMessage({ type: 'success', text: t('settings.profileUpdated') });
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.message || t('settings.error') });
            }
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: t('settings.error') });
        } finally {
            setIsLoading(false);
        }
    };

    const { showModal } = useModal();

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            showModal({ title: t('settings.changePassword'), message: t('auth.passwordTooShort') || 'Password must be at least 6 characters', type: 'warning' });
            return;
        }
        if (newPassword !== confirmPassword) {
            showModal({ title: t('settings.changePassword'), message: t('auth.passwordMismatch') || 'Passwords do not match', type: 'warning' });
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await res.json();

            if (res.ok) {
                showModal({ title: t('settings.changePassword'), message: t('settings.passwordUpdated') || 'Password updated successfully', type: 'success' });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                showModal({ title: t('settings.changePassword'), message: data.message || t('settings.passwordUpdateFailed') || 'Failed to update password', type: 'error' });
            }
        } catch (error) {
            console.error(error);
            showModal({ title: t('settings.changePassword'), message: t('settings.error') || 'An error occurred', type: 'error' });
        }
    };


    const handleLanguageChange = async (lang: 'en' | 'bg') => {
        setLanguage(lang);
        try {
            await authenticatedFetch('/api/auth/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: lang }),
            });
        } catch (error) {
            console.error('Failed to persist language preference', error);
        }
    };

    return (
        <div className="content-wrapper" style={{ overflowY: 'auto', maxHeight: '100vh' }}>
            <section className="content-header">
                <div className="container-fluid">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1>
                                <Link href="/" className="text-dark mr-2">
                                    <i className="fas fa-arrow-left"></i>
                                </Link>
                                {t('settings.title')}
                            </h1>
                        </div>
                    </div>
                </div>
            </section>

            <section className="content">
                <div className="container-fluid">
                    {message && (
                        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'} alert-dismissible fade show`} role="alert">
                            {message.text}
                            <button type="button" className="close" onClick={() => setMessage(null)}>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                    )}

                    <div className="row">
                        <div className="col-md-6">
                            {/* Profile Settings */}
                            <div className="card card-success">
                                <div className="card-header">
                                    <h3 className="card-title">
                                        <i className="fas fa-user mr-2"></i>
                                        {t('settings.profile')}
                                    </h3>
                                </div>
                                <form onSubmit={handleUpdateProfile}>
                                    <div className="card-body">
                                        <div className="form-group">
                                            <label>{t('auth.nickname')}</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={nickname}
                                                onChange={(e) => setNickname(e.target.value)}
                                                placeholder={t('settings.nicknamePlaceholder')}
                                            />
                                        </div>
                                    </div>
                                    <div className="card-footer">
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="btn btn-success"
                                        >
                                            {isLoading ? t('settings.saving') : t('settings.save')}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Language Settings */}
                            <div className="card card-primary">
                                <div className="card-header">
                                    <h3 className="card-title">
                                        <i className="fas fa-language mr-2"></i>
                                        {t('settings.language')}
                                    </h3>
                                </div>
                                <div className="card-body">
                                    <div className="btn-group w-100">
                                        <button
                                            type="button"
                                            className={`btn ${language === 'en' ? 'btn-primary' : 'btn-default'}`}
                                            onClick={() => handleLanguageChange('en')}
                                        >
                                            🇬🇧 English
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn ${language === 'bg' ? 'btn-primary' : 'btn-default'}`}
                                            onClick={() => handleLanguageChange('bg')}
                                        >
                                            🇧🇬 Български
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Notification Settings */}
                            <div className="card card-info">
                                <div className="card-header">
                                    <h3 className="card-title">
                                        <i className="fas fa-bell mr-2"></i>
                                        {t('settings.notifications')}
                                    </h3>
                                </div>
                                <div className="card-body">
                                    {pushError && <div className="alert alert-danger">{pushError}</div>}

                                    {/* Push System */}
                                    <div className="form-group border-bottom pb-3">
                                        <label>{t('settings.pushNotifications')}</label>
                                        <div className="custom-control custom-switch">
                                            <input
                                                type="checkbox"
                                                className="custom-control-input"
                                                id="pushSwitch"
                                                checked={isSubscribed}
                                                onChange={(e) => e.target.checked ? subscribe() : unsubscribe()}
                                                disabled={loading}
                                            />
                                            <label className="custom-control-label" htmlFor="pushSwitch">
                                                {isSubscribed ? t('settings.pushEnabled') : t('settings.pushDisabled')}
                                            </label>
                                        </div>
                                        <small className="form-text text-muted">
                                            {isSubscribed ? t('settings.pushEnabledDesc') : t('settings.pushDisabledDesc')}
                                        </small>
                                    </div>

                                    {/* Quote Notifications */}
                                    <div className="form-group mt-3">
                                        <label>{t('settings.quoteNotifications')}</label>
                                        <div className="custom-control custom-switch">
                                            <input
                                                type="checkbox"
                                                className="custom-control-input"
                                                id="quoteSwitch"
                                                checked={quoteNotifications}
                                                onChange={(e) => setQuoteNotifications(e.target.checked)}
                                            />
                                            <label className="custom-control-label" htmlFor="quoteSwitch">
                                                {quoteNotifications ? t('settings.pushEnabled') : t('settings.pushDisabled')}
                                            </label>
                                        </div>
                                        <small className="form-text text-muted mb-2">
                                            {t('settings.quoteEnabledDesc')}
                                        </small>

                                        {quoteNotifications && (
                                            <div className="mt-2">
                                                <label>{t('settings.quoteInterval')}</label>
                                                <select
                                                    className="form-control"
                                                    value={quoteNotificationIntervalMin}
                                                    onChange={(e) => setQuoteNotificationIntervalMin(Number(e.target.value))}
                                                >
                                                    <option value={30}>{t('settings.interval.30m')}</option>
                                                    <option value={60}>{t('settings.interval.1h')}</option>
                                                    <option value={180}>{t('settings.interval.3h')}</option>
                                                    <option value={360}>{t('settings.interval.6h')}</option>
                                                    <option value={720}>{t('settings.interval.12h')}</option>
                                                    <option value={1440}>{t('settings.interval.24h')}</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-info mt-3"
                                        onClick={handleUpdateProfile} // Re-using user update for quote prefs
                                    >
                                        {t('settings.save')} {t('settings.notifications')}
                                    </button>
                                </div>
                            </div>

                        </div>

                        <div className="col-md-6">
                            {/* Security Settings */}
                            <div className="card card-danger">
                                <div className="card-header">
                                    <h3 className="card-title">
                                        <i className="fas fa-shield-alt mr-2"></i>
                                        {t('settings.security')}
                                    </h3>
                                </div>
                                <form onSubmit={handlePasswordChange}>
                                    <div className="card-body">
                                        <div className="form-group">
                                            <label>{t('settings.currentPassword')}</label>
                                            <input
                                                type="password"
                                                className="form-control"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>{t('settings.newPassword')}</label>
                                            <input
                                                type="password"
                                                className="form-control"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>{t('settings.confirmNewPassword')}</label>
                                            <input
                                                type="password"
                                                className="form-control"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="card-footer">
                                        <button type="submit" className="btn btn-danger">{t('settings.updatePassword')}</button>
                                    </div>
                                </form>
                            </div>

                            {/* Email Settings */}
                            <div className="card card-warning">
                                <div className="card-header">
                                    <h3 className="card-title">
                                        <i className="fas fa-envelope mr-2"></i>
                                        {t('settings.emailNotifications')}
                                    </h3>
                                </div>
                                <div className="card-body">
                                    {/* Email Reminders */}
                                    <div className="form-group border-bottom pb-3">
                                        <label>{t('settings.emailReminders')}</label>
                                        <div className="custom-control custom-switch">
                                            <input
                                                type="checkbox"
                                                className="custom-control-input"
                                                id="emailReminderSwitch"
                                                checked={emailNotifications}
                                                onChange={(e) => setEmailNotifications(e.target.checked)}
                                            />
                                            <label className="custom-control-label" htmlFor="emailReminderSwitch">
                                                {emailNotifications ? t('settings.pushEnabled') : t('settings.pushDisabled')}
                                            </label>
                                        </div>
                                        <small className="form-text text-muted">
                                            {t('settings.emailRemindersDesc')}
                                        </small>
                                    </div>

                                    {/* Email Quote Notifications */}
                                    <div className="form-group mt-3">
                                        <label>{t('settings.emailQuoteNotifications')}</label>
                                        <div className="custom-control custom-switch">
                                            <input
                                                type="checkbox"
                                                className="custom-control-input"
                                                id="emailQuoteSwitch"
                                                checked={emailQuoteNotifications}
                                                onChange={(e) => setEmailQuoteNotifications(e.target.checked)}
                                            />
                                            <label className="custom-control-label" htmlFor="emailQuoteSwitch">
                                                {emailQuoteNotifications ? t('settings.pushEnabled') : t('settings.pushDisabled')}
                                            </label>
                                        </div>
                                        <small className="form-text text-muted">
                                            {t('settings.emailQuoteDesc')}
                                        </small>
                                    </div>

                                    <button
                                        type="button"
                                        className="btn btn-warning mt-3"
                                        onClick={handleUpdateProfile}
                                    >
                                        {t('settings.saveEmail')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
