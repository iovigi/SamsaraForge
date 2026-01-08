'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import HabitBoard from '@/components/HabitBoard';

import { useLanguage } from '../../context/LanguageContext';

export default function HabitsPage() {
    const router = useRouter();
    const { t } = useLanguage();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/auth/login');
        }
    }, [router]);

    return (
        <div className="content-wrapper kanban" suppressHydrationWarning>
            <section className="content-header">
                <div className="container-fluid">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1>{t('nav.habits')}</h1>
                        </div>
                    </div>
                </div>
            </section>

            <Suspense fallback={<div>Loading...</div>}>
                <HabitBoard />
            </Suspense>
        </div>
    );
}
