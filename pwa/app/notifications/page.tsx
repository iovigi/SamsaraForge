'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { API_BASE_URL } from '../../utils/config';

interface NotificationType {
    _id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    isRead: boolean;
    link?: string;
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

    useEffect(() => {
        fetchNotifications();
    }, [showUnreadOnly]);

    const getIconClass = (type: string) => {
        switch (type) {
            case 'success': return 'fas fa-check-circle text-success';
            case 'warning': return 'fas fa-exclamation-triangle text-warning';
            case 'error': return 'fas fa-times-circle text-danger';
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
                                                                <strong className="d-block">{n.title}</strong>
                                                                <span className="text-muted">{n.message}</span>
                                                            </Link>
                                                            <small className="text-muted">
                                                                {new Date(n.createdAt).toLocaleString()}
                                                            </small>
                                                        </div>
                                                    </td>
                                                    <td style={{ width: '150px' }} className="text-right">
                                                        {!n.isRead && (
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
