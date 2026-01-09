import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface DailyHabitCardProps {
    title: string;
    description?: string;
    status: 'TODO' | 'DONE';
    type?: 'SIMPLE' | 'TIMED' | 'COUNT'; // Future proofing
    onComplete: () => void;
    completed?: boolean;
    streak?: number;
}

export default function DailyHabitCard({ title, description, status, type = 'SIMPLE', onComplete, streak }: DailyHabitCardProps) {
    const { t } = useLanguage();
    const isDone = status === 'DONE';

    return (
        <div className={`card shadow-sm border-0 mb-3 daily-habit-card ${isDone ? 'bg-light' : 'bg-white'}`} style={{ borderRadius: '15px', transition: 'all 0.2s', opacity: isDone ? 0.8 : 1 }}>
            <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-start">
                    <div>
                        <div className="d-flex align-items-center mb-1">
                            <h6 className={`font-weight-bold mb-0 ${isDone ? 'text-muted' : ''}`} style={{ textDecoration: isDone ? 'line-through' : 'none' }}>
                                {title}
                            </h6>
                            {streak && streak > 0 && (
                                <span className="badge badge-warning ml-2 text-white" style={{ fontSize: '0.7rem' }}>
                                    <i className="fas fa-fire mr-1"></i> {streak}
                                </span>
                            )}
                        </div>
                        {description && <p className="small text-muted mb-2">{description}</p>}
                    </div>
                    {isDone && <i className="fas fa-check-circle text-success ml-2" style={{ fontSize: '1.2rem' }}></i>}
                </div>

                <div className="mt-2 d-flex justify-content-end">
                    {!isDone ? (
                        <>
                            {/* Placeholder for Note feature */}
                            <button className="btn btn-light btn-sm mr-2 text-muted" style={{ borderRadius: '8px' }}>
                                <i className="fas fa-sticky-note mr-1"></i> {t('dashboard.note')}
                            </button>

                            {type === 'TIMED' ? (
                                <button onClick={onComplete} className="btn btn-primary btn-sm px-3" style={{ borderRadius: '8px' }}>
                                    <i className="fas fa-play mr-1"></i> {t('dashboard.startTimer')}
                                </button>
                            ) : (
                                <button onClick={onComplete} className="btn btn-outline-primary btn-sm px-3" style={{ borderRadius: '8px' }}>
                                    <i className="fas fa-check mr-1"></i> {t('dashboard.done')}
                                </button>
                            )}
                        </>
                    ) : (
                        <button onClick={onComplete} className="btn btn-light btn-sm text-muted" style={{ borderRadius: '8px' }}>
                            {t('dashboard.undo')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
