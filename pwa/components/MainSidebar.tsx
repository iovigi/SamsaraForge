'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { useLanguage } from '../context/LanguageContext';

export default function MainSidebar() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const pathname = usePathname();
    const { t } = useLanguage();

    useEffect(() => {
        const token = localStorage.getItem('token');
        setIsLoggedIn(!!token);
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
                        <li className="nav-item">
                            <a href="/settings" className={`nav-link ${pathname === '/settings' ? 'active' : ''}`}>
                                <i className="nav-icon fas fa-cog"></i>
                                <p>{t('nav.settings')}</p>
                            </a>
                        </li>
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
