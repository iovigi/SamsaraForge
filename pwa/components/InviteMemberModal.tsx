'use client';

import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface InviteMemberModalProps {
    onClose: () => void;
    onSubmit: (email: string) => void;
}

export default function InviteMemberModal({ onClose, onSubmit }: InviteMemberModalProps) {
    const [email, setEmail] = useState('');
    const { t } = useLanguage();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(email);
    }

    return (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">{t('teams.invite')}</h4>
                        <button type="button" className="close" onClick={onClose}>
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>{t('users.email')}</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t('team.search')}
                                    required
                                />
                            </div>
                        </div>
                        <div className="modal-footer justify-content-between">
                            <button type="button" className="btn btn-default" onClick={onClose}>{t('common.close')}</button>
                            <button type="submit" className="btn btn-primary">{t('teams.invite')}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
