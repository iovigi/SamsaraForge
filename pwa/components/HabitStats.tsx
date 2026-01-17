import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface HabitStatsProps {
    totalVictories: number;
    bestStreak: number;
    currentStreak: number;
    perfectDays: number;
}

const HabitStats: React.FC<HabitStatsProps> = ({ totalVictories, bestStreak, currentStreak, perfectDays }) => {
    const { t } = useLanguage();

    const StatCard = ({ title, value, icon, color }: { title: string, value: number, icon: string, color: string }) => (
        <div className="col-6 col-md-3 mb-3">
            <div className={`card border-0 shadow-sm h-100 py-3`} style={{ borderRadius: '15px' }}>
                <div className="card-body text-center p-2">
                    <div className={`icon-circle mb-2 mx-auto d-flex align-items-center justify-content-center text-${color}`}
                        style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: `var(--${color}-light, rgba(0,0,0,0.05))` }}>
                        <i className={`fas ${icon} fa-lg`}></i>
                    </div>
                    <h3 className="font-weight-bold mb-0 text-dark">{value}</h3>
                    <small className="text-muted text-uppercase font-weight-bold" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>{title}</small>
                </div>
            </div>
        </div>
    );

    return (
        <div className="row mb-4">
            <StatCard
                title={t('dashboard.totalVictories') || 'Total Victories'}
                value={totalVictories}
                icon="fa-trophy"
                color="warning"
            />
            <StatCard
                title={t('dashboard.currentStreak') || 'Current Streak'}
                value={currentStreak}
                icon="fa-fire"
                color="danger"
            />
            <StatCard
                title={t('dashboard.bestStreak') || 'Best Streak'}
                value={bestStreak}
                icon="fa-medal"
                color="primary"
            />
            <StatCard
                title={t('dashboard.perfectDays') || 'Perfect Days'}
                value={perfectDays}
                icon="fa-star"
                color="success"
            />
        </div>
    );
};

export default HabitStats;
