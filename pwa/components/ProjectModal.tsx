'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { uploadFile } from '../utils/api';

interface ProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    project?: any;
    onSave: (project: any) => void;
}

export default function ProjectModal({ isOpen, onClose, project, onSave }: ProjectModalProps) {
    const { t } = useLanguage();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [backgroundUrl, setBackgroundUrl] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (project) {
            setName(project.name);
            setDescription(project.description || '');
            setStartDate(project.startDate ? project.startDate.split('T')[0] : '');
            setEndDate(project.endDate ? project.endDate.split('T')[0] : '');
            setBackgroundUrl(project.backgroundUrl || '');
        } else {
            setName('');
            setDescription('');
            setStartDate('');
            setEndDate('');
            setBackgroundUrl('');
        }
    }, [project, isOpen]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploading(true);
            try {
                const res = await uploadFile(e.target.files[0]);
                // Need to prepend API URL if it returns relative path, or assume server handles it
                // Based on our API, it returns /uploads/filename. We might need full URL for PWA if different domain, 
                // but usually relative works if proxying. Let's assume absolute for now or relative if same origin.
                // Actually, API is likely on localhost:5000 and PWA on 3000. So we need base URL.
                // But let's just store the path and let the Image component handle domain if needed,
                // or simpler: just store what API gives and use a utility to display.
                // For now, let's assume valid URL string.

                // If the PWA is on port 3000 and API on 5000, we need the API Base URL. 
                // However, our upload utility returns what the API returns.
                // Let's prepend API_BASE_URL (imported from config in real app, but here hardcoded or context).
                // Actually let's just use the relative path and fix display later or rely on full url.
                // The API returned `/uploads/...` which is path on API server.
                // We will rely on `ProjectCard` to render it. If it's pure path, we might need to prefix.
                // Let's store full URL if possible? No, store path is better.
                // Let's just persist what we got.
                setBackgroundUrl(res.url);
            } catch (err) {
                console.error('Upload failed', err);
                alert('Failed to upload image');
            } finally {
                setUploading(false);
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            _id: project?._id,
            name,
            description,
            startDate,
            endDate,
            backgroundUrl
        });
    };

    if (!isOpen) return null;

    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">{project ? t('projects.edit') : t('projects.new')}</h5>
                        <button type="button" className="close" onClick={onClose}>
                            <span>&times;</span>
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
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('projects.description')}</label>
                                <textarea
                                    className="form-control"
                                    rows={3}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group col-md-6">
                                    <label>{t('projects.startDate')}</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="form-group col-md-6">
                                    <label>{t('projects.endDate')}</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>{t('projects.backgroundImage')}</label>
                                <div className="custom-file">
                                    <input type="file" className="custom-file-input" onChange={handleFileChange} accept="image/*" />
                                    <label className="custom-file-label" data-browse={t('common.browse')}>{t('tasks.chooseFile')}</label>
                                </div>
                                {uploading && <small className="text-muted">{t('projects.uploading')}</small>}
                                {backgroundUrl && (
                                    <div className="mt-2">
                                        <img src={backgroundUrl.startsWith('http') ? backgroundUrl : `http://localhost:5000${backgroundUrl}`} alt="Preview" style={{ height: '60px', borderRadius: '4px' }} />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('projects.cancel')}</button>
                            <button type="submit" className="btn btn-primary" disabled={uploading}>{t('projects.save')}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
