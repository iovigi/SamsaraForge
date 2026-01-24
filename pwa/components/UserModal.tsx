import React, { useState, useEffect } from 'react';
import { User } from '../types/auth'; // You need to verify if this moves to types/auth or where I defined it. I defined it in types/auth.ts
import { useLanguage } from '../context/LanguageContext';
import { authenticatedFetch } from '../utils/api';

interface UserModalProps {
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export default function UserModal({ user, isOpen, onClose, onSave }: UserModalProps) {
    const { t } = useLanguage();
    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            setNickname(user.nickname || '');
            setEmail(user.email);
            setIsAdmin(user.isAdmin);
            setIsBlocked(user.isBlocked || false);
            setPassword(''); // Don't show password
        } else {
            // Reset fields for new user if needed, but we only edit here for now based on requirements "see all other users... change them password, delete them, block them"
            // If creation was needed we'd handle it here too.
        }
        setError('');
    }, [user, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        if (!user) return;

        try {
            const body: any = {
                nickname,
                isAdmin,
                isBlocked
            };
            if (password) {
                body.password = password;
            }

            const res = await authenticatedFetch(`/api/users/${user._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                onSave();
                onClose();
            } else {
                const data = await res.json();
                // Prefer server message if it might be specific, otherwise generic
                // For now, let's just show the generic localized one to be safe as per user request
                setError(`${t('users.updateFailed')}: ${data.message}`);
            }
        } catch (err: any) {
            setError(t('settings.error'));
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen || !user) return null;

    return (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">{t('users.edit')}</h4>
                        <button type="button" className="close" onClick={onClose}>
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            {error && <div className="alert alert-danger">{error}</div>}

                            <div className="form-group">
                                <label>{t('users.email')}</label>
                                <input type="text" className="form-control" value={email} disabled />
                            </div>

                            <div className="form-group">
                                <label>{t('users.nickname')}</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label>{t('users.changePassword')} <small className="text-muted">({t('settings.newPassword')})</small></label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={t('users.passwordPlaceholder')}
                                />
                            </div>

                            <div className="form-check">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id="isAdminCheck"
                                    checked={isAdmin}
                                    onChange={(e) => setIsAdmin(e.target.checked)}
                                />
                                <label className="form-check-label" htmlFor="isAdminCheck">{t('users.admin')}</label>
                            </div>

                            <div className="form-check">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id="isBlockedCheck"
                                    checked={isBlocked}
                                    onChange={(e) => setIsBlocked(e.target.checked)}
                                />
                                <label className="form-check-label" htmlFor="isBlockedCheck">{t('users.blocked')}</label>
                            </div>
                        </div>
                        <div className="modal-footer justify-content-between">
                            <button type="button" className="btn btn-default" onClick={onClose}>{t('users.cancel')}</button>
                            <button type="submit" className="btn btn-primary" disabled={isLoading}>
                                {isLoading ? t('auth.processing') : t('users.save')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
