import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface DailyHabitCardProps {
    title: string;
    description?: string;
    status: 'TODO' | 'DONE';
    type?: 'SIMPLE' | 'TIMED' | 'COUNT';
    onComplete: () => void;
    completed?: boolean;
    streak?: number;
    onAddNote?: () => void;
    timeFrame?: { start: string; end: string };
    dragListeners?: any; // Dnd Kit listeners
}

export default function DailyHabitCard({ title, description, status, type = 'SIMPLE', onComplete, streak, onAddNote, timeFrame, dragListeners }: DailyHabitCardProps) {
    const { t } = useLanguage();
    const isDone = status === 'DONE';

    // Expiration Logic (Duplicate from HabitBoard, ideally shared utility but fine for now)
    const isExpiring = (() => {
        if (isDone || !timeFrame?.end) return false;
        const now = new Date();
        const [endH, endM] = timeFrame.end.split(':').map(Number);
        const deadline = new Date();
        deadline.setHours(endH, endM, 0, 0);

        const diffMs = deadline.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        return diffHours > 0 && diffHours < 3;
    })();

    return (
        <div className={`card shadow-sm border-0 mb-3 daily-habit-card ${isDone ? 'bg-light' : 'bg-white'}`} style={{ borderRadius: '15px', transition: 'all 0.2s', opacity: isDone ? 0.8 : 1, touchAction: 'manipulation' }}>
            <div className="card-body p-3">
                <div className="d-flex align-items-start">
                    {/* Drag Handle */}
                    {dragListeners && (
                        <div className="mr-3 mt-1 text-muted" {...dragListeners} style={{ cursor: 'grab', touchAction: 'none' }}>
                            <i className="fas fa-grip-vertical fa-lg" style={{ opacity: 0.3 }}></i>
                        </div>
                    )}

                    <div className="flex-grow-1">
                        <div className="d-flex justify-content-between">
                            <div>
                                <div className="d-flex align-items-center mb-1">
                                    <h6 className={`font-weight-bold mb-0 ${isDone ? 'text-muted' : ''}`} style={{ textDecoration: isDone ? 'line-through' : 'none' }}>
                                        {title}
                                    </h6>
                                    {isExpiring && (
                                        <span className="badge badge-danger ml-2" style={{ fontSize: '0.65rem' }}>
                                            <i className="fas fa-exclamation-triangle mr-1"></i> {t('kanban.expiresSoon')}
                                        </span>
                                    )}
                                    {(streak || 0) > 0 && (
                                        <span className="badge badge-warning ml-2 text-white" style={{ fontSize: '0.7rem' }}>
                                            <i className="fas fa-fire mr-1"></i> {streak}
                                        </span>
                                    )}
                                </div>
                                {description && <p className="small text-muted mb-2">{description}</p>}
                            </div>
                            {isDone && <i className="fas fa-check-circle text-success ml-2" style={{ fontSize: '1.2rem' }}></i>}
                        </div>
                    </div>
                </div>

                <div className="mt-2 d-flex justify-content-end">
                    {!isDone ? (
                        <>
                            <button onClick={onAddNote} className="btn btn-light btn-sm mr-2 text-muted" style={{ borderRadius: '8px' }}>
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
