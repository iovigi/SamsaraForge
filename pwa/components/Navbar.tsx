'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import NotificationBell from './NotificationBell';

export default function Navbar() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const token = localStorage.getItem('token');
        setIsLoggedIn(!!token);
    }, [pathname]);

    if (!isLoggedIn || pathname === '/' || pathname === '/landing' || pathname?.startsWith('/auth/')) {
        return null;
    }

    return (
        <nav className="main-header navbar navbar-expand navbar-white navbar-light">
            <ul className="navbar-nav">
                <li className="nav-item">
                    <a className="nav-link" data-widget="pushmenu" href="#" role="button"><i className="fas fa-bars"></i></a>
                </li>
            </ul>

            <ul className="navbar-nav ml-auto">
                <NotificationBell />
            </ul>
        </nav>
    );
}
