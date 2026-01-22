'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { uploadFile, authenticatedFetch } from '../utils/api';
import { API_BASE_URL } from '../utils/config';

interface ProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    project?: any;
    onSave: (project: any) => void;
}

export default function ProjectModal({ isOpen, onClose, project, onSave }: ProjectModalProps) {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('details');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [backgroundUrl, setBackgroundUrl] = useState('');
    const [uploading, setUploading] = useState(false);

    // Team State
    const [members, setMembers] = useState<any[]>([]);
    const [owner, setOwner] = useState<any>(null);
    const [inviteEmail, setInviteEmail] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await authenticatedFetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    setCurrentUser(data.user);
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchUser();

        if (project) {
            setName(project.name);
            setDescription(project.description || '');
            setStartDate(project.startDate ? project.startDate.split('T')[0] : '');
            setEndDate(project.endDate ? project.endDate.split('T')[0] : '');
            setBackgroundUrl(project.backgroundUrl || '');
            fetchMembers();
        } else {
            setName('');
            setDescription('');
            setStartDate('');
            setEndDate('');
            setBackgroundUrl('');
        }
    }, [project, isOpen]);

    const fetchMembers = async () => {
        if (!project) return;
        try {
            const res = await authenticatedFetch(`/api/projects/${project._id}/members`);
            if (res.ok) {
                const data = await res.json();
                setMembers(data.members);
                setOwner(data.owner);
            }
        } catch (err) {
            console.error('Failed to fetch members', err);
        }
    };

    const searchUsers = async (query: string) => {
        setInviteEmail(query);
        if (query.length < 3) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        try {
            const res = await authenticatedFetch(`/api/users/search?q=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                setSearchResults(data.users);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSearching(false);
        }
    };

    const handleAddMember = async (email: string) => {
        try {
            const res = await authenticatedFetch(`/api/projects/${project._id}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (res.ok) {
                const data = await res.json();
                setMembers(data.members);
                setInviteEmail('');
                setSearchResults([]);
                alert(t('team.memberAdded' as any));
            } else {
                const err = await res.json();
                alert(err.message || t('team.addFailed' as any));
            }
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleRemoveMember = async (userId: string) => {
        // If removing self? But here we need to know who we are? 
        // We relied on button logic. But confirm message needs localization.
        // We can't easily distinguish 'remove myself' vs 'remove other' for confirm blindly.
        // Let's just say "Are you sure?" which is generic. Or use new keys.
        if (!confirm(t('team.removeConfirm' as any))) return;
        try {
            const res = await authenticatedFetch(`/api/projects/${project._id}/members?userId=${userId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                const data = await res.json();
                setMembers(data.members);
            } else {
                const err = await res.json();
                alert(err.message || t('team.removeFailed' as any));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploading(true);
            try {
                const res = await uploadFile(e.target.files[0]);
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
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">{project ? t('projects.edit') : t('projects.new')}</h5>
                        <button type="button" className="close" onClick={onClose}>
                            <span>&times;</span>
                        </button>
                    </div>

                    {project && (
                        <div className="modal-header border-bottom-0 pb-0">
                            <ul className="nav nav-tabs border-bottom-0">
                                <li className="nav-item">
                                    <button
                                        className={`nav-link ${activeTab === 'details' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('details')}
                                    >
                                        {t('tasks.details')}
                                    </button>
                                </li>
                                <li className="nav-item">
                                    <button
                                        className={`nav-link ${activeTab === 'team' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('team')}
                                    >
                                        {t('projects.team' as any)}
                                    </button>
                                </li>
                            </ul>
                        </div>
                    )}

                    <div className="modal-body">
                        {activeTab === 'details' ? (
                            <form onSubmit={handleSubmit} id="projectForm">
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
                                            <img src={backgroundUrl.startsWith('http') ? backgroundUrl : `${API_BASE_URL}${backgroundUrl}`} alt="Preview" style={{ height: '60px', borderRadius: '4px' }} />
                                        </div>
                                    )}
                                </div>
                            </form>
                        ) : (
                            <div className="team-management">
                                <div className="mb-4">
                                    <h6>{t('team.owner' as any)}</h6>
                                    {owner && (
                                        <div className="media align-items-center mb-3">
                                            <div className="media-body">
                                                <h6 className="mt-0">{owner.nickname || 'User'} <small className="text-muted">({owner.email})</small></h6>
                                                <span className="badge badge-primary">{t('team.owner' as any)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <h6>{t('team.members' as any)}</h6>
                                    <ul className="list-group">
                                        {members.length === 0 && <li className="list-group-item text-muted">{t('team.noMembers' as any)}</li>}
                                        {members.map(member => (
                                            <li key={member.userId._id} className="list-group-item d-flex justify-content-between align-items-center">
                                                <div>
                                                    <h6 className="mb-0">{member.userId.nickname || 'User'}</h6>
                                                    <small className="text-muted">{member.userId.email}</small>
                                                </div>
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => handleRemoveMember(member.userId._id)}
                                                >
                                                    {t('team.remove' as any)} / {t('team.leave' as any)}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {currentUser && owner && currentUser._id === owner._id && (
                                    <div className="mb-3">
                                        <h6>{t('team.invite' as any)}</h6>
                                        <div className="position-relative">
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder={t('team.search' as any)}
                                                value={inviteEmail}
                                                onChange={(e) => searchUsers(e.target.value)}
                                            />
                                            {searchResults.length > 0 && (
                                                <div className="list-group position-absolute w-100 shadow" style={{ zIndex: 1000, maxHeight: '200px', overflow: 'auto' }}>
                                                    {searchResults.map(user => (
                                                        <button
                                                            key={user._id}
                                                            className="list-group-item list-group-item-action"
                                                            onClick={() => handleAddMember(user.email)}
                                                        >
                                                            {user.email} <small className="text-muted">({user.nickname})</small>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <small className="form-text text-muted">{t('team.userMustHaveAccount' as any)}</small>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>{t('projects.cancel')}</button>
                        {activeTab === 'details' && (
                            <button type="submit" form="projectForm" className="btn btn-primary" disabled={uploading}>{t('projects.save')}</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
