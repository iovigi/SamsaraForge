'use client';

import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { uploadFile } from '../utils/api';
import { API_BASE_URL } from '../utils/config';

interface EditTeamModalProps {
    teamName: string;
    teamLogo?: string;
    onClose: () => void;
    onSubmit: (name: string, logoUrl?: string) => void;
}

export default function EditTeamModal({ teamName, teamLogo, onClose, onSubmit }: EditTeamModalProps) {
    const [name, setName] = useState(teamName);
    const [logoUrl, setLogoUrl] = useState(teamLogo || '');
    const [uploading, setUploading] = useState(false);
    const { t } = useLanguage();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploading(true);
            try {
                const res = await uploadFile(e.target.files[0]);
                setLogoUrl(res.url);
            } catch (err) {
                console.error('Upload failed', err);
            } finally {
                setUploading(false);
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(name, logoUrl);
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
                            <div className="form-group">
                                <label>{t('teams.logo')}</label>
                                <div className="custom-file">
                                    <input type="file" className="custom-file-input" onChange={handleFileChange} accept="image/*" />
                                    <label className="custom-file-label" data-browse={t('common.browse')}>{t('tasks.chooseFile')}</label>
                                </div>
                                {uploading && <small className="text-muted">{t('projects.uploading')}</small>}
                                {logoUrl && (
                                    <div className="mt-2 text-center position-relative">
                                        <div className="d-inline-block position-relative">
                                            <img
                                                src={logoUrl.startsWith('http') ? logoUrl : `${API_BASE_URL}${logoUrl}`}
                                                alt="Team Logo"
                                                style={{ height: '100px', width: '100px', objectFit: 'cover', borderRadius: '50%', border: '2px solid #ddd' }}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-danger btn-xs position-absolute"
                                                style={{ top: '0', right: '-10px', borderRadius: '50%' }}
                                                onClick={() => setLogoUrl('')}
                                                title={t('teams.removeLogo')}
                                            >
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </div>
                                    </div>
                                )}
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
