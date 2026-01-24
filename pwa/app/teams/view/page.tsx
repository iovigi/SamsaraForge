'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authenticatedFetch, parseJwt } from '../../../utils/api';
import InviteMemberModal from '../../../components/InviteMemberModal';
import EditTeamModal from '../../../components/EditTeamModal';
import ProjectModal from '../../../components/ProjectModal';
import { useLanguage } from '../../../context/LanguageContext';
import { useModal } from '../../../context/ModalContext';

function TeamDetailsContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const [team, setTeam] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [currentUserEmail, setCurrentUserEmail] = useState('');
    const [currentUserId, setCurrentUserId] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            const decoded = parseJwt(token);
            setCurrentUserId(decoded.userId);
        }
        if (id) {
            fetchTeam();
        }
    }, [id]);

    const fetchTeam = async () => {
        if (!id) return;
        try {
            const res = await authenticatedFetch(`/api/teams/${id}`);
            if (res.ok) {
                const data = await res.json();
                setTeam(data.team);

                // Check if current user is admin of the team
                const token = localStorage.getItem('token');
                if (token && data.team) {
                    const decoded = parseJwt(token);
                    const member = data.team.members.find((m: any) => m.userId._id === decoded.userId);
                    if (member && member.role === 'ADMIN') {
                        setIsAdmin(true);
                    }
                }
            } else {
                router.push('/teams'); // Redirect if not found or no access
            }
        } catch (error) {
            console.error('Error fetching team', error);
        } finally {
            setLoading(false);
        }
    };

    const { showModal } = useModal();
    const { t } = useLanguage();

    const handleInvite = async (email: string) => {
        if (!id) return;
        try {
            const res = await authenticatedFetch(`/api/teams/${id}/invite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (res.ok) {
                showModal({ title: t('teams.invite'), message: 'Invitation sent', type: 'success' });
                setShowInviteModal(false);
            } else {
                const data = await res.json();
                showModal({ title: t('teams.invite'), message: data.message || 'Failed to send invitation', type: 'error' });
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleRemoveMember = (memberId: string) => {
        showModal({
            title: t('team.remove'),
            message: t('team.removeConfirm'),
            type: 'warning',
            confirmText: t('team.remove'),
            cancelText: t('common.cancel'),
            onConfirm: async () => {
                try {
                    const res = await authenticatedFetch(`/api/teams/${id}/members`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: memberId })
                    });
                    if (res.ok) {
                        fetchTeam();
                        showModal({ title: t('team.remove'), message: t('team.memberRemoved') || 'Member removed successfully', type: 'success' });
                    } else {
                        const data = await res.json();
                        showModal({ title: t('team.remove'), message: data.message || 'Failed to remove member', type: 'error' });
                    }
                } catch (error) {
                    console.error(error);
                }
            }
        });
    };

    const handleUpdateRole = async (memberId: string, newRole: string) => {
        try {
            const res = await authenticatedFetch(`/api/teams/${id}/members`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: memberId, role: newRole })
            });
            if (res.ok) {
                fetchTeam();
            } else {
                const data = await res.json();
                showModal({ title: t('team.role'), message: data.message || 'Failed to update role', type: 'error' });
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleEditTeam = async (name: string) => {
        try {
            const res = await authenticatedFetch(`/api/teams/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (res.ok) {
                fetchTeam();
                setShowEditModal(false);
            } else {
                showModal({ title: t('teams.edit'), message: 'Failed to update team', type: 'error' });
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteTeam = () => {
        showModal({
            title: t('teams.delete'),
            message: 'Are you sure you want to delete this team? This cannot be undone.',
            type: 'warning',
            confirmText: t('common.delete'),
            cancelText: t('common.cancel'),
            onConfirm: async () => {
                try {
                    const res = await authenticatedFetch(`/api/teams/${id}`, {
                        method: 'DELETE'
                    });
                    if (res.ok) {
                        router.push('/teams');
                    } else {
                        showModal({ title: t('teams.delete'), message: 'Failed to delete team', type: 'error' });
                    }
                } catch (error) {
                    console.error(error);
                }
            }
        });
    };

    const handleCreateProject = async (projectData: any) => {
        if (!id) return;
        try {
            // 1. Create Project
            const res = await authenticatedFetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectData)
            });

            if (res.ok) {
                const data = await res.json();
                const projectId = data.project._id;

                // 2. Add Team to Project
                const updateRes = await authenticatedFetch(`/api/projects/${projectId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        teams: [{ teamId: id }]
                    })
                });

                if (updateRes.ok) {
                    setShowProjectModal(false);
                    showModal({
                        title: t('projects.new'),
                        message: 'Project created and linked to team!',
                        type: 'success',
                        onConfirm: () => window.location.reload()
                    });
                } else {
                    showModal({ title: t('projects.new'), message: 'Project created but failed to link team.', type: 'error' });
                }
            } else {
                showModal({ title: t('projects.new'), message: 'Failed to create project', type: 'error' });
            }
        } catch (err) {
            console.error(err);
            showModal({ title: t('projects.new'), message: 'Error creating project', type: 'error' });
        }
    };

    if (loading) return <div className="p-4">{t('common.loading') || 'Loading...'}</div>;
    if (!team) return <div className="p-4">{t('teams.notFound') || 'Team not found'}</div>;

    return (
        <div className="content-wrapper">
            <section className="content-header">
                <div className="container-fluid">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1>{team.name}</h1>
                        </div>
                        <div className="col-sm-6">
                            {isAdmin && (
                                <div className="float-sm-right">
                                    <button className="btn btn-primary mr-2" onClick={() => setShowInviteModal(true)}>
                                        <i className="fas fa-user-plus"></i> {t('teams.invite') || 'Invite Member'}
                                    </button>
                                    <button className="btn btn-warning mr-2" onClick={() => setShowEditModal(true)}>
                                        <i className="fas fa-edit"></i> {t('common.edit') || 'Edit'}
                                    </button>
                                    <button className="btn btn-danger" onClick={handleDeleteTeam}>
                                        <i className="fas fa-trash"></i> {t('common.delete') || 'Delete'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="content">
                <div className="container-fluid">
                    <div className="card card-primary card-outline card-outline-tabs">
                        <div className="card-header p-0 border-bottom-0">
                            <ul className="nav nav-tabs" id="team-tabs" role="tablist">
                                <li className="nav-item">
                                    <a className="nav-link active" id="members-tab" data-toggle="pill" href="#members" role="tab" aria-controls="members" aria-selected="true">{t('team.members')}</a>
                                </li>
                                <li className="nav-item">
                                    <a className="nav-link" id="projects-tab" data-toggle="pill" href="#projects" role="tab" aria-controls="projects" aria-selected="false">{t('nav.projects')}</a>
                                </li>
                            </ul>
                        </div>
                        <div className="card-body">
                            <div className="tab-content" id="team-tabs-content">
                                <div className="tab-pane fade show active" id="members" role="tabpanel" aria-labelledby="members-tab">
                                    {/* Desktop View */}
                                    <div className="d-none d-md-block">
                                        <table className="table table-striped">
                                            <thead>
                                                <tr>
                                                    <th>{t('users.nickname')}</th>
                                                    <th>{t('users.email')}</th>
                                                    <th>{t('users.role')}</th>
                                                    <th>{t('users.joined')}</th>
                                                    {isAdmin && <th style={{ width: '150px' }}>{t('users.actions')}</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {team.members.map((member: any) => (
                                                    <tr key={member._id}>
                                                        <td>{member.userId.nickname || 'N/A'}</td>
                                                        <td>{member.userId.email}</td>
                                                        <td>
                                                            <span className={`badge ${member.role === 'ADMIN' ? 'badge-warning' : 'badge-primary'}`}>
                                                                {member.role}
                                                            </span>
                                                        </td>
                                                        <td>{new Date(member.joinedAt).toLocaleDateString()}</td>
                                                        {isAdmin && (
                                                            <td>
                                                                {member.userId._id !== currentUserId && (
                                                                    <>
                                                                        <div className="btn-group btn-group-sm mr-2">
                                                                            {member.role === 'MEMBER' && (
                                                                                <button className="btn btn-info" title="Promote to Admin" onClick={() => handleUpdateRole(member.userId._id, 'ADMIN')}>
                                                                                    <i className="fas fa-arrow-up"></i>
                                                                                </button>
                                                                            )}
                                                                            {member.role === 'ADMIN' && (
                                                                                <button className="btn btn-secondary" title="Demote to Member" onClick={() => handleUpdateRole(member.userId._id, 'MEMBER')}>
                                                                                    <i className="fas fa-arrow-down"></i>
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                        <button className="btn btn-danger btn-sm" title="Remove Member" onClick={() => handleRemoveMember(member.userId._id)}>
                                                                            <i className="fas fa-trash"></i>
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile View */}
                                    <div className="d-md-none">
                                        {team.members.map((member: any) => (
                                            <div className="card mb-3" key={member._id}>
                                                <div className="card-body p-3">
                                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                                        <div>
                                                            <h5 className="mb-0 font-weight-bold">{member.userId.nickname || 'N/A'}</h5>
                                                            <small className="text-muted">{member.userId.email}</small>
                                                        </div>
                                                        <span className={`badge ${member.role === 'ADMIN' ? 'badge-warning' : 'badge-primary'}`}>
                                                            {member.role}
                                                        </span>
                                                    </div>

                                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                                        <small className="text-muted">
                                                            <i className="far fa-calendar-alt mr-1"></i>
                                                            {t('users.joined')}: {new Date(member.joinedAt).toLocaleDateString()}
                                                        </small>
                                                    </div>

                                                    {isAdmin && member.userId._id !== currentUserId && (
                                                        <div className="border-top pt-2 mt-2 d-flex justify-content-end">
                                                            {member.role === 'MEMBER' && (
                                                                <button className="btn btn-outline-info btn-sm mr-2" onClick={() => handleUpdateRole(member.userId._id, 'ADMIN')}>
                                                                    <i className="fas fa-arrow-up mr-1"></i> Make Admin
                                                                </button>
                                                            )}
                                                            {member.role === 'ADMIN' && (
                                                                <button className="btn btn-outline-secondary btn-sm mr-2" onClick={() => handleUpdateRole(member.userId._id, 'MEMBER')}>
                                                                    <i className="fas fa-arrow-down mr-1"></i> Demote
                                                                </button>
                                                            )}
                                                            <button className="btn btn-outline-danger btn-sm" onClick={() => handleRemoveMember(member.userId._id)}>
                                                                <i className="fas fa-trash mr-1"></i> Remove
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="tab-pane fade" id="projects" role="tabpanel" aria-labelledby="projects-tab">
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h5 className="mb-0">{t('nav.projects')}</h5>
                                        <button className="btn btn-success btn-sm" onClick={() => setShowProjectModal(true)}>
                                            <i className="fas fa-plus"></i> {t('projects.new')}
                                        </button>
                                    </div>
                                    <TeamProjectList teamId={id!} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {showInviteModal && (
                <InviteMemberModal onClose={() => setShowInviteModal(false)} onSubmit={handleInvite} />
            )}

            {showEditModal && (
                <EditTeamModal
                    teamName={team.name}
                    onClose={() => setShowEditModal(false)}
                    onSubmit={handleEditTeam}
                />
            )}

            {showProjectModal && (
                <ProjectModal
                    isOpen={showProjectModal}
                    onClose={() => setShowProjectModal(false)}
                    onSave={handleCreateProject}
                />
            )}
        </div>
    );
}

function TeamProjectList({ teamId }: { teamId: string }) {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = useLanguage();
    const router = useRouter();

    const fetchProjects = async () => {
        try {
            const res = await authenticatedFetch(`/api/teams/${teamId}/projects`);
            if (res.ok) {
                const data = await res.json();
                setProjects(data.projects);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (teamId) fetchProjects();
    }, [teamId]);

    if (loading) return <div>{t('common.loading')}</div>;
    if (projects.length === 0) return <div className="text-muted">{t('teams.noProjects') || 'No projects assigned to this team.'}</div>;

    return (
        <div className="row">
            {projects.map(p => (
                <div className="col-md-6" key={p._id}>
                    <div className="card card-primary card-outline">
                        <div className="card-header">
                            <h5 className="card-title">{p.name}</h5>
                        </div>
                        <div className="card-body">
                            <button className="btn btn-sm btn-primary" onClick={() => router.push(`/projects/view?id=${p._id}`)}>
                                {t('common.viewDetails')}
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function TeamDetailsPage() {
    return (
        <Suspense fallback={<div className="p-4">Loading...</div>}>
            <TeamDetailsContent />
        </Suspense>
    );
}
