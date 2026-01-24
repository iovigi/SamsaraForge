'use client';

import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface EditTeamModalProps {
    teamName: string;
    onClose: () => void;
    onSubmit: (name: string) => void;
}

export default function EditTeamModal({ teamName, onClose, onSubmit }: EditTeamModalProps) {
    const [name, setName] = useState(teamName);
    const { t } = useLanguage();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(name);
    }

    return (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">{t('teams.edit')}</h4>
                        <button type="button" className="close" onClick={onClose}>
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>{t('projects.name')}</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('teams.enterName')}
                                    required
                                />
                            </div>
                        </div>
                        <div className="modal-footer justify-content-between">
                            <button type="button" className="btn btn-default" onClick={onClose}>{t('common.close')}</button>
                            <button type="submit" className="btn btn-primary">{t('common.save')}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
