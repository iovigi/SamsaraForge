'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useLanguage } from '../context/LanguageContext';
import { authenticatedFetch, parseJwt } from '../utils/api';

export default function MainSidebar() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { t } = useLanguage();

    // ... rest of checking logs ...

    useEffect(() => {
        const token = localStorage.getItem('token');
        setIsLoggedIn(!!token);
        if (token) {
            const decoded = parseJwt(token);
            setIsAdmin(decoded?.isAdmin || false);
        } else {
            setIsAdmin(false);
        }
    }, [pathname]); // Re-check on route change

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userEmail');
        window.location.href = '/';
    };

    if (!isLoggedIn || pathname === '/' || pathname === '/landing' || pathname?.startsWith('/auth/')) {
        return null;
    }

    return (
        <aside className="main-sidebar sidebar-dark-primary elevation-4">
            {/* Brand Logo */}
            <a href="/landing" className="brand-link">
                <img src="/assets/logo2.png" alt="Samsara Logo" className="brand-image img-circle elevation-3" style={{ opacity: .8, backgroundColor: 'white' }} />
                <span className="brand-text font-weight-light">Samsara Forge</span>
            </a>

            {/* Sidebar */}
            <div className="sidebar">
                {/* Sidebar Menu */}
                <nav className="mt-2">
                    <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">

                        <li className="nav-item">
                            <a href="/dashboard" className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`}>
                                <i className="nav-icon fas fa-tachometer-alt"></i>
                                <p>{t('nav.dashboard')}</p>
                            </a>
                        </li>
                        <li className="nav-item">
                            <a href="/habits" className={`nav-link ${pathname === '/habits' ? 'active' : ''}`}>
                                <i className="nav-icon fas fa-columns"></i>
                                <p>{t('nav.habits')}</p>
                            </a>
                        </li>
                        <li className={`nav-item ${pathname?.startsWith('/projects') ? 'menu-open' : ''}`}>
                            <a href="#" className={`nav-link ${pathname === '/projects' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); router.push('/projects'); }}>
                                <i className="nav-icon fas fa-project-diagram"></i>
                                <p>
                                    {t('nav.projects')}
                                    <i className="right fas fa-angle-left"></i>
                                </p>
                            </a>
                            <ul className="nav nav-treeview">
                                <ProjectSidebarList />
                            </ul>
                        </li>
                        <li className="nav-item">
                            <a href="/settings" className={`nav-link ${pathname === '/settings' ? 'active' : ''}`}>
                                <i className="nav-icon fas fa-cog"></i>
                                <p>{t('nav.settings')}</p>
                            </a>
                        </li>
                        {isAdmin && (
                            <li className="nav-item">
                                <a href="/users" className={`nav-link ${pathname === '/users' ? 'active' : ''}`}>
                                    <i className="nav-icon fas fa-users"></i>
                                    <p>{t('nav.users')}</p>
                                </a>
                            </li>
                        )}
                        <li className="nav-item">
                            <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
                                <i className="nav-icon fas fa-sign-out-alt"></i>
                                <p>{t('sidebar.logout')}</p>
                            </a>
                        </li>
                    </ul>
                </nav>
            </div>
        </aside>
    );
}

import { listenToProjectsUpdate } from '../utils/events';

function ProjectSidebarList() {
    const [projects, setProjects] = useState<any[]>([]);
    const pathname = usePathname();

    const fetchProjects = async () => {
        try {
            const res = await authenticatedFetch('/api/projects');
            if (res.ok) {
                const data = await res.json();
                setProjects(data.projects);
            }
        } catch (error) {
            console.error('Error loading sidebar projects', error);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchProjects();

        // Listen for updates using helper
        const cleanup = listenToProjectsUpdate(() => {
            console.log('Refreshing sidebar projects...');
            fetchProjects();
        });

        // Poll for updates (e.g. name changes from others)
        const interval = setInterval(fetchProjects, 5000);

        return () => {
            cleanup();
            clearInterval(interval);
        };
    }, []);

    return (
        <>
            {projects.map(p => (
                <li className="nav-item" key={p._id}>
                    <a href={`/projects/view?id=${p._id}`} className={`nav-link ${pathname === `/projects/view` && window.location.search.includes(p._id) ? 'active' : ''}`}>
                        <i className="fas fa-clipboard-list nav-icon"></i>
                        <p className="text-truncate">{p.name}</p>
                    </a>
                </li>
            ))}
        </>
    );
}
