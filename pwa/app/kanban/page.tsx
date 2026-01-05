'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import KanbanBoard from '@/components/KanbanBoard';

export default function KanbanPage() {
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/auth/login');
        }
    }, [router]);

    return (
        <div className="content-wrapper kanban">
            <section className="content-header">
                <div className="container-fluid">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1>Habit Board</h1>
                        </div>
                    </div>
                </div>
            </section>

            <KanbanBoard />
        </div>
    );
}
