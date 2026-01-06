'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import KanbanBoard from '@/components/KanbanBoard';

import { useLanguage } from '../../context/LanguageContext';

export default function KanbanPage() {
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
                            <h1>{t('nav.kanban')}</h1>
                        </div>
                    </div>
                </div>
            </section>

            <KanbanBoard />
        </div>
    );
}
