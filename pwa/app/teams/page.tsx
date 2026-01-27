'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authenticatedFetch } from '../../utils/api';
import TeamModal from '@/components/TeamModal';
import { useLanguage } from '../../context/LanguageContext';
import { useModal } from '../../context/ModalContext';
import { API_BASE_URL } from '../../utils/api';

function TeamsContent() {
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [pendingInvites, setPendingInvites] = useState<any[]>([]);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLanguage();

    const fetchTeams = async () => {
        try {
            const res = await authenticatedFetch('/api/teams');
            if (res.ok) {
                const data = await res.json();
                setTeams(data.teams);
            }
        } catch (error) {
            console.error('Error fetching teams', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchInvites = async () => {
        try {
            const res = await authenticatedFetch('/api/invitations');
            if (res.ok) {
                const data = await res.json();
                setPendingInvites(data.invitations);
            }
        } catch (error) {
            console.error('Error fetching invitations', error);
        }
    };

    const handleInviteFromUrl = async () => {
        const inviteToken = searchParams.get('invite');
        if (inviteToken) {
            // Ideally we should have an endpoint to check token details or just show it in the list if implementation supports it.
            // Current backend implementation of /api/invitations gets all pending invites for email.
            // If the user clicked the link, they should see the invite in the pending list if the email matches.
            // If the token is just for verification, we might need a specific "claim" action, but as per plan, we list pending invites.
            // We can perhaps highlight it or auto-prompt.
            // For now, let's just refresh invites.
        }
    };

    useEffect(() => {
        fetchTeams();
        fetchInvites();
        handleInviteFromUrl();
    }, []);

    const { showModal } = useModal();

    const handleCreateTeam = async (name: string, logoUrl?: string) => {
        try {
            const res = await authenticatedFetch('/api/teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, logoUrl })
            });
            if (res.ok) {
                setShowCreateModal(false);
                fetchTeams();
                showModal({ title: t('teams.create'), message: 'Team created successfully', type: 'success' });
            } else {
                showModal({ title: t('teams.create'), message: 'Failed to create team', type: 'error' });
            }
        } catch (error) {
            console.error(error);
            showModal({ title: t('teams.create'), message: 'Error creating team', type: 'error' });
        }
    };

    const handleRespondInvite = async (id: string, accept: boolean) => {
        try {
            const res = await authenticatedFetch(`/api/invitations/${id}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accept })
            });
            if (res.ok) {
                fetchInvites();
                if (accept) fetchTeams();
            }
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <div className="content-wrapper">
            <section className="content-header">
                <div className="container-fluid">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1>{t('teams.title') || 'Teams'}</h1>
                        </div>
                        <div className="col-sm-6">
                            <button className="btn btn-primary float-sm-right" onClick={() => setShowCreateModal(true)}>
                                <i className="fas fa-plus"></i> {t('teams.create') || 'Create Team'}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="content">
                <div className="container-fluid">

                    {/* Pending Invitations */}
                    {pendingInvites.length > 0 && (
                        <div className="card card-info">
                            <div className="card-header">
                                <h3 className="card-title">{t('teams.pendingInvites') || 'Pending Invitations'}</h3>
                            </div>
                            <div className="card-body p-0">
                                <table className="table">
                                    <tbody>
                                        {pendingInvites.map(invite => (
                                            <tr key={invite._id}>
                                                <td>
                                                    {t('teams.invitedBy', { team: invite.teamId?.name, inviter: invite.invitedBy?.nickname || invite.invitedBy?.email }) || `You have been invited to join ${invite.teamId?.name} by ${invite.invitedBy?.nickname || invite.invitedBy?.email}`}
                                                </td>
                                                <td className="text-right">
                                                    <button className="btn btn-success btn-sm mr-2" onClick={() => handleRespondInvite(invite._id, true)}>{t('common.accept') || 'Accept'}</button>
                                                    <button className="btn btn-danger btn-sm" onClick={() => handleRespondInvite(invite._id, false)}>{t('common.reject') || 'Reject'}</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Teams List */}
                    <div className="row">
                        {loading ? (
                            <p className="p-4">{t('common.loading') || 'Loading...'}</p>
                        ) : teams.length === 0 ? (
                            <div className="col-12">
                                <div className="callout callout-info">
                                    <h5>{t('teams.noTeams') || 'No Teams Found'}</h5>
                                    <p>{t('teams.noTeamsDesc') || 'You are not a member of any team yet. Create one or ask to be invited.'}</p>
                                </div>
                            </div>
                        ) : (
                            teams.map(team => (
                                <div className="col-md-4" key={team._id}>
                                    <div className="card card-primary card-outline">
                                        <div className="card-header">
                                            <div className="d-flex align-items-center">
                                                {team.logoUrl ? (
                                                    <img
                                                        src={team.logoUrl.startsWith('http') ? team.logoUrl : `${API_BASE_URL}${team.logoUrl}`}
                                                        alt={team.name}
                                                        className="mr-2"
                                                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '50%' }}
                                                    />
                                                ) : (
                                                    <div className="mr-2 bg-secondary d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', borderRadius: '50%' }}>
                                                        <i className="fas fa-users"></i>
                                                    </div>
                                                )}
                                                <h3 className="card-title">{team.name}</h3>
                                            </div>
                                        </div>
                                        <div className="card-body">
                                            <p>{t('team.members') || 'Members'}: {team.members?.length || 0}</p>
                                            <button className="btn btn-block btn-outline-primary" onClick={() => router.push(`/teams/view?id=${team._id}`)}>
                                                {t('common.viewDetails') || 'View Details'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {showCreateModal && (
                <TeamModal onClose={() => setShowCreateModal(false)} onSubmit={handleCreateTeam} />
            )}
        </div>
    );
}

export default function TeamsPage() {
    return (
        <Suspense fallback={<div className="content-wrapper"><div className="p-4">Loading...</div></div>}>
            <TeamsContent />
        </Suspense>
    );
}
