'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';

import { usePushSubscription } from '../../hooks/usePushSubscription';
import { authenticatedFetch } from '../../utils/api';


export default function SettingsPage() {
    const { language, setLanguage, t } = useLanguage();
    const { isSubscribed, subscribe, unsubscribe, loading, error: pushError } = usePushSubscription();

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Profile state
    const [nickname, setNickname] = useState('');

    const [showSuccessModal, setShowSuccessModal] = useState(false);

    useEffect(() => {
        // Fetch current user data
        const fetchUser = async () => {
            try {
                const res = await authenticatedFetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    if (data.user?.nickname) {
                        setNickname(data.user.nickname);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchUser();
    }, []);

    const handleUpdateProfile = async () => {
        try {
            const res = await authenticatedFetch('/api/auth/me', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ nickname })
            });

            const data = await res.json();
            if (res.ok) {
                // alert(t('settings.profileUpdated') || 'Profile updated successfully');
                setShowSuccessModal(true);
            } else {
                alert(data.message || 'Failed to update');
            }
        } catch (error) {
            console.error(error);
            alert(t('settings.error'));
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            alert(t('auth.passwordTooShort') || 'Password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            alert(t('auth.passwordMismatch') || 'Passwords do not match');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await res.json();

            if (res.ok) {
                alert(t('settings.passwordUpdated') || 'Password updated successfully');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                alert(data.message || t('settings.passwordUpdateFailed') || 'Failed to update password');
            }
        } catch (error) {
            console.error(error);
            alert(t('settings.error') || 'An error occurred');
        }
    };

    return (
        <div className="content-wrapper">
            <section className="content-header">
                <div className="container-fluid">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1>{t('settings.title')}</h1>
                        </div>
                    </div>
                </div>
            </section>

            <section className="content">
                <div className="container-fluid">
                    <div className="row">
                        <div className="col-md-6">
                            {/* Profile Settings */}
                            <div className="card card-success">
                                <div className="card-header">
                                    <h3 className="card-title">{t('settings.profile')}</h3>
                                </div>
                                <div className="card-body">
                                    <div className="form-group">
                                        <label>{t('auth.nickname')}</label>
                                        <div className="input-group">
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={nickname}
                                                onChange={(e) => setNickname(e.target.value)}
                                                placeholder={t('auth.nickname')}
                                            />
                                            <span className="input-group-append">
                                                <button
                                                    type="button"
                                                    className="btn btn-success"
                                                    onClick={handleUpdateProfile}
                                                >
                                                    {t('settings.updateProfile')}
                                                </button>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Language Settings */}
                            <div className="card card-primary mt-3">
                                <div className="card-header">
                                    <h3 className="card-title">{t('settings.language')}</h3>
                                </div>
                                <div className="card-body">
                                    <div className="form-group">
                                        <label>{t('settings.language')}</label>
                                        <div className="d-flex gap-3">
                                            <button
                                                className={`btn ${language === 'en' ? 'btn-primary' : 'btn-outline-primary'}`}
                                                onClick={() => setLanguage('en')}
                                            >
                                                🇬🇧 English
                                            </button>
                                            <button
                                                className={`btn ${language === 'bg' ? 'btn-primary' : 'btn-outline-primary'}`}
                                                onClick={() => setLanguage('bg')}
                                            >
                                                🇧🇬 Български
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Notification Settings */}
                            <div className="card card-info mt-3">
                                <div className="card-header">
                                    <h3 className="card-title">{t('settings.notifications')}</h3>
                                </div>
                                <div className="card-body">
                                    {pushError && <div className="alert alert-danger">{pushError}</div>}
                                    <div className="form-group">
                                        <label>{t('settings.pushNotifications')}</label>
                                        <div className="custom-control custom-switch">
                                            <div className="form-check form-switch">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="pushSwitch"
                                                    checked={isSubscribed}
                                                    onChange={(e) => e.target.checked ? subscribe() : unsubscribe()}
                                                    disabled={loading}
                                                />
                                                <label className="form-check-label" htmlFor="pushSwitch">
                                                    {loading ? t('auth.processing') : (isSubscribed ? t('settings.pushEnabled') : t('settings.pushDisabled'))}
                                                </label>
                                            </div>
                                        </div>
                                        <small className="form-text text-muted">
                                            {isSubscribed
                                                ? t('settings.pushEnabledDesc')
                                                : t('settings.pushDisabledDesc')}
                                        </small>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-6">
                            {/* Security Settings */}
                            <div className="card card-danger">
                                <div className="card-header">
                                    <h3 className="card-title">{t('settings.security')}</h3>
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
                        </div>
                    </div>
                </div>
            </section>

            {/* Bootstrap Modal for Success */}
            {showSuccessModal && (
                <>
                    <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <div className="modal-dialog modal-dialog-centered" role="document">
                            <div className="modal-content">
                                <div className="modal-header bg-success text-white">
                                    <h5 className="modal-title">Success</h5>
                                    <button type="button" className="close text-white" onClick={() => setShowSuccessModal(false)}>
                                        <span aria-hidden="true">&times;</span>
                                    </button>
                                </div>
                                <div className="modal-body">
                                    <p className="text-center">
                                        <i className="fas fa-check-circle fa-3x text-success mb-3"></i><br />
                                        {t('settings.profileUpdated')}
                                    </p>
                                </div>
                                <div className="modal-footer justify-content-center">
                                    <button type="button" className="btn btn-success px-4" onClick={() => setShowSuccessModal(false)}>
                                        OK
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
