'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function MainSidebar() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const token = localStorage.getItem('token');
        setIsLoggedIn(!!token);
    }, [pathname]); // Re-check on route change

    if (!isLoggedIn || pathname === '/') {
        return null;
    }

    return (
        <aside className="main-sidebar sidebar-dark-primary elevation-4">
            {/* Brand Logo */}
            <a href="/kanban" className="brand-link">
                <img src="/assets/dist/img/AdminLTELogo.png" alt="Samsara Logo" className="brand-image img-circle elevation-3" style={{ opacity: .8 }} />
                <span className="brand-text font-weight-light">Samsara Forge</span>
            </a>

            {/* Sidebar */}
            <div className="sidebar">
                {/* Sidebar Menu */}
                <nav className="mt-2">
                    <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">

                        <li className="nav-item">
                            <a href="/kanban" className={`nav-link ${pathname === '/kanban' ? 'active' : ''}`}>
                                <i className="nav-icon fas fa-columns"></i>
                                <p>Habit Board</p>
                            </a>
                        </li>
                    </ul>
                </nav>
            </div>
        </aside>
    );
}
