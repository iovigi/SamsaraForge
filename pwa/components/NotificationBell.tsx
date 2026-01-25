'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL } from '../utils/config';

interface NotificationType {
    _id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    isRead: boolean;
    link?: string;
    createdAt: string;
}

export default function NotificationBell() {
    const { t } = useLanguage();
    const [notifications, setNotifications] = useState<NotificationType[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications`, {
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

    const markAllAsRead = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ all: true })
            });
            const data = await res.json();
            if (data.success) {
                setNotifications([]);
            }
        } catch (error) {
            console.error('Failed to mark notifications as read', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Optional: Polling every 1 minute
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const getIconClass = (type: string) => {
        switch (type) {
            case 'success': return 'fas fa-check-circle text-success';
            case 'warning': return 'fas fa-exclamation-triangle text-warning';
            case 'error': return 'fas fa-times-circle text-danger';
            default: return 'fas fa-info-circle text-info';
        }
    };

    return (
        <li className="nav-item dropdown">
            <a className="nav-link" data-toggle="dropdown" href="#" aria-expanded="false" style={{ cursor: 'pointer' }}>
                <i className="far fa-bell"></i>
                {notifications.length > 0 && (
                    <span className="badge badge-warning navbar-badge">{notifications.length}</span>
                )}
            </a>
            <div className="dropdown-menu dropdown-menu-lg dropdown-menu-right">
                <span className="dropdown-item dropdown-header">
                    {notifications.length} {t('nav.notifications')}
                </span>
                <div className="dropdown-divider"></div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                        <div className="dropdown-item text-center text-muted py-3">
                            {t('notifications.empty')}
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <a key={n._id} href={n.link || '#'} className="dropdown-item">
                                <div className="media">
                                    <div className="mr-3 mt-1">
                                        <i className={getIconClass(n.type)}></i>
                                    </div>
                                    <div className="media-body">
                                        <p className="text-sm font-weight-bold mb-0">{n.title}</p>
                                        <p className="text-sm text-muted mb-0">{n.message}</p>
                                        <p className="text-sm text-muted">
                                            <i className="far fa-clock mr-1"></i>
                                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            </a>
                        ))
                    )}
                </div>
                <div className="dropdown-divider"></div>
                {notifications.length > 0 && (
                    <button
                        onClick={(e) => { e.preventDefault(); markAllAsRead(); }}
                        className="dropdown-item dropdown-footer btn btn-link"
                    >
                        {t('notifications.markAllRead')}
                    </button>
                )}
                <Link href="/notifications" className="dropdown-item dropdown-footer">{t('notifications.viewAll')}</Link>
            </div>
        </li>
    );
}
