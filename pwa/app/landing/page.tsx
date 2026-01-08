'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function LandingPage() {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const { t } = useLanguage();

    useEffect(() => {
        const token = localStorage.getItem('token');
        setIsLoggedIn(!!token);
    }, []);

    const handleGetStarted = (e: React.MouseEvent) => {
        if (isLoggedIn) {
            e.preventDefault();
            router.push('/dashboard');
        }
    };

    return (
        <div
            className="landing-page-wrapper d-flex align-items-center justify-content-center"
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url("/assets/dist/img/landing-bg.png") no-repeat center center',
                backgroundSize: 'cover',
                marginLeft: 0,
                color: 'white',
                textAlign: 'center',
            }}
        >
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-md-8">
                        <div className="mb-4 d-flex justify-content-center">
                            <img
                                src="/assets/dist/img/logo.png"
                                alt="Samsara Forge"
                                className="img-fluid"
                                style={{ maxHeight: 500, width: 'auto' }}
                            />
                        </div>

                        <h2 className="mb-3" style={{ fontSize: '2.5rem', fontWeight: 300 }}>
                            {t('landing.title')}
                        </h2>

                        <p className="lead mb-5" style={{ fontSize: '1.25rem', opacity: 0.9 }}>
                            {t('landing.subtitle')}
                        </p>

                        <a
                            href="/auth/register"
                            onClick={handleGetStarted}
                            className="btn btn-lg"
                            style={{
                                backgroundColor: '#b8860b',
                                borderColor: '#b8860b',
                                color: 'white',
                                padding: '12px 30px',
                                borderRadius: '5px',
                                fontSize: '1.2rem',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                            }}
                        >
                            {t('landing.getStarted')}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
