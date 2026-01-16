'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import UserModal from '../../components/UserModal';
import { useLanguage } from '../../context/LanguageContext';
import { authenticatedFetch, parseJwt } from '../../utils/api';
import { User } from '../../types/auth'; // Ensure this path is correct

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { t } = useLanguage();
    const router = useRouter();

    const fetchUsers = async () => {
        try {
            const res = await authenticatedFetch('/api/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            } else if (res.status === 403) {
                // Not admin
                router.push('/dashboard');
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/auth/login');
            return;
        }

        const decoded = parseJwt(token);
        if (!decoded || !decoded.isAdmin) {
            router.push('/dashboard');
            return;
        }

        fetchUsers();
    }, []);

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleDelete = async (userId: string) => {
        if (!window.confirm(t('users.deleteConfirm'))) return;

        try {
            const res = await authenticatedFetch(`/api/users/${userId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setUsers(users.filter(u => u._id !== userId));
            } else {
                const errorData = await res.json();
                alert(`${t('users.deleteFailed')}: ${errorData.message}`);
            }
        } catch (error) {
            console.error('Error deleting user', error);
            alert(t('settings.error'));
        }
    };

    const toggleBlock = async (user: User) => {
        try {
            console.log('Toggling block for user:', user._id);
            const res = await authenticatedFetch(`/api/users/${user._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isBlocked: !user.isBlocked })
            });

            if (res.ok) {
                const updatedUser = await res.json();
                setUsers(users.map(u => u._id === user._id ? updatedUser : u));
            } else {
                const errorData = await res.json();
                console.error('Failed to toggle block:', errorData);
                alert(`Error: ${errorData.message || 'Failed to update user status'}`);
            }
        } catch (error) {
            console.error('Error toggling block', error);
            alert('An unexpected error occurred while updating user status');
        }
    };

    return (
        <>
            <div className="content-wrapper">
                <section className="content-header">
                    <div className="container-fluid">
                        <div className="row mb-2">
                            <div className="col-sm-6">
                                <h1>{t('users.title')}</h1>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="content">
                    <div className="container-fluid">
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">{t('users.list')}</h3>
                            </div>
                            <div className="card-body p-0">
                                {isLoading ? (
                                    <div className="p-4 text-center">{t('projects.loading')}</div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-striped projects">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '25%' }}>{t('users.email')}</th>
                                                    <th style={{ width: '20%' }}>{t('users.nickname')}</th>
                                                    <th style={{ width: '10%' }}>{t('users.role')}</th>
                                                    <th style={{ width: '10%' }}>{t('users.status')}</th>
                                                    <th style={{ width: '20%' }}>{t('users.joined')}</th>
                                                    <th style={{ width: '25%' }}>{t('users.actions')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {users.map(user => (
                                                    <tr key={user._id}>
                                                        <td>{user.email}</td>
                                                        <td>{user.nickname || '-'}</td>
                                                        <td>
                                                            {user.isAdmin ? (
                                                                <span className="badge badge-warning">{t('users.admin')}</span>
                                                            ) : (
                                                                <span className="badge badge-success">{t('users.user')}</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {user.isBlocked ? (
                                                                <span className="badge badge-danger">{t('users.blocked')}</span>
                                                            ) : (
                                                                <span className="badge badge-primary">{t('users.active')}</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                                                        </td>
                                                        <td className="text-nowrap">
                                                            <div className="btn-group btn-group-sm">
                                                                <button
                                                                    className="btn btn-info btn-sm d-inline-flex align-items-center"
                                                                    onClick={() => handleEdit(user)}
                                                                    title={t('users.edit')}
                                                                    style={{ whiteSpace: 'nowrap', minWidth: '110px', justifyContent: 'center' }}
                                                                >
                                                                    <i className="fas fa-pencil-alt mr-1"></i>
                                                                    {t('common.edit')}
                                                                </button>
                                                                <button
                                                                    className={`btn ${user.isBlocked ? 'btn-success' : 'btn-warning'} btn-sm d-inline-flex align-items-center`}
                                                                    onClick={() => toggleBlock(user)}
                                                                    title={user.isBlocked ? t('users.unblock') : t('users.block')}
                                                                    style={{ whiteSpace: 'nowrap', minWidth: '110px', justifyContent: 'center' }}
                                                                >
                                                                    <i className={`fas ${user.isBlocked ? 'fa-unlock' : 'fa-ban'} mr-1`}></i>
                                                                    {user.isBlocked ? t('users.unblock') : t('users.block')}
                                                                </button>
                                                                <button
                                                                    className="btn btn-danger btn-sm d-inline-flex align-items-center"
                                                                    onClick={() => handleDelete(user._id)}
                                                                    title={t('users.delete')}
                                                                    style={{ whiteSpace: 'nowrap', minWidth: '110px', justifyContent: 'center' }}
                                                                >
                                                                    <i className="fas fa-trash mr-1"></i>
                                                                    {t('common.delete')}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {users.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="text-center text-muted">{t('users.noUsers')}</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <UserModal
                user={selectedUser}
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedUser(null); }}
                onSave={fetchUsers}
            />
        </>
    );
}
