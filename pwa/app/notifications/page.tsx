'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { API_BASE_URL } from '../../utils/config';

interface NotificationType {
    _id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success' | 'team_invitation';
    isRead: boolean;
    link?: string;
    metadata?: {
        invitationId: string;
        teamId: string;
        teamName?: string;
        inviterName?: string;
        token: string;
    };
    createdAt: string;
}

export default function NotificationsPage() {
    const { t } = useLanguage();
    const [notifications, setNotifications] = useState<NotificationType[]>([]);
    const [loading, setLoading] = useState(true);
    const [showUnreadOnly, setShowUnreadOnly] = useState(false);

    const fetchNotifications = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications?all=${!showUnreadOnly}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setNotifications(data.notifications);
            }
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ notificationIds: [id] })
            });
            const data = await res.json();
            if (data.success) {
                setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
                if (showUnreadOnly) {
                    setNotifications(prev => prev.filter(n => n._id !== id));
                }
            }
        } catch (error) {
            console.error('Failed to mark notification as read', error);
        }
    };

    const handleInvitationResponse = async (notificationId: string, invitationId: string, accept: boolean) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/invitations/${invitationId}/respond`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ accept })
            });
            const data = await res.json();
            if (res.ok) {
                await markAsRead(notificationId);
            } else {
                alert(data.message || 'Failed to respond to invitation');
            }
        } catch (error) {
            console.error('Failed to respond to invitation', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [showUnreadOnly]);

    const getIconClass = (type: string) => {
        switch (type) {
            case 'success': return 'fas fa-check-circle text-success';
            case 'warning': return 'fas fa-exclamation-triangle text-warning';
            case 'error': return 'fas fa-times-circle text-danger';
            case 'team_invitation': return 'fas fa-users text-primary';
            default: return 'fas fa-info-circle text-info';
        }
    };

    return (
        <div className="content-wrapper">
            <section className="content-header">
                <div className="container-fluid">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1>
                                <Link href="/dashboard" className="mr-2 text-dark">
                                    <i className="fas fa-arrow-left"></i>
                                </Link>
                                {t('notifications.title')}
                            </h1>
                        </div>
                    </div>
                </div>
            </section>

            <section className="content">
                <div className="container-fluid">
                    <div className="card">
                        <div className="card-header d-flex align-items-center justify-content-between">
                            <h3 className="card-title">{t('notifications.all')}</h3>
                            <div className="card-tools ml-auto">
                                <button
                                    className={`btn btn-sm ${showUnreadOnly ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                                >
                                    {t('notifications.unread')}
                                </button>
                            </div>
                        </div>
                        <div className="card-body p-0">
                            {loading ? (
                                <div className="text-center p-5">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="sr-only">Loading...</span>
                                    </div>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="text-center p-5 text-muted">
                                    <i className="far fa-bell fa-3x mb-3"></i>
                                    <p>{t('notifications.empty')}</p>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0">
                                        <tbody>
                                            {notifications.map(n => (
                                                <tr key={n._id} className={n.isRead ? '' : 'bg-light'}>
                                                    <td style={{ width: '50px' }} className="text-center">
                                                        <i className={getIconClass(n.type)}></i>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex justify-content-between">
                                                            <Link href={n.link || '#'} className="text-dark">
                                                                <strong className="d-block">
                                                                    {n.type === 'team_invitation' ? t('notifications.teamInvitation.title') : n.title}
                                                                </strong>
                                                                <span className="text-muted">
                                                                    {n.type === 'team_invitation' && n.metadata
                                                                        ? t('teams.invitedBy', { team: n.metadata.teamName || '', inviter: n.metadata.inviterName || '' })
                                                                        : n.message}
                                                                </span>
                                                            </Link>
                                                            <small className="text-muted">
                                                                {new Date(n.createdAt).toLocaleString()}
                                                            </small>
                                                        </div>
                                                    </td>
                                                    <td style={{ width: '250px' }} className="text-right">
                                                        {n.type === 'team_invitation' && !n.isRead && n.metadata && (
                                                            <div className="btn-group">
                                                                <button
                                                                    onClick={() => handleInvitationResponse(n._id, n.metadata!.invitationId, true)}
                                                                    className="btn btn-xs btn-success mr-1"
                                                                >
                                                                    <i className="fas fa-check mr-1"></i>
                                                                    {t('common.accept')}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleInvitationResponse(n._id, n.metadata!.invitationId, false)}
                                                                    className="btn btn-xs btn-danger mr-1"
                                                                >
                                                                    <i className="fas fa-times mr-1"></i>
                                                                    {t('common.reject')}
                                                                </button>
                                                                <Link
                                                                    href={n.link || '#'}
                                                                    className="btn btn-xs btn-outline-primary"
                                                                >
                                                                    <i className="fas fa-eye mr-1"></i>
                                                                    {t('common.viewDetails')}
                                                                </Link>
                                                            </div>
                                                        )}
                                                        {!n.isRead && n.type !== 'team_invitation' && (
                                                            <button
                                                                onClick={() => markAsRead(n._id)}
                                                                className="btn btn-xs btn-outline-success"
                                                            >
                                                                {t('notifications.markRead')}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
