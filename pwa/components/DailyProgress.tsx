import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface DailyProgressProps {
    completed: number;
    total: number;
    userName?: string;
}

export default function DailyProgress({ completed, total, userName }: DailyProgressProps) {
    const { t } = useLanguage();
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const name = userName || 'Friend';

    // Use 'any' to bypass strict keyof check for dynamic content if needed, or better, cast to string but t() might complain if strict.
    // simpler: allow string for now or cast.
    const [greetingKey, setGreetingKey] = React.useState('dashboard.greeting' as any);

    React.useEffect(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) {
            setGreetingKey('dashboard.greeting.morning');
        } else if (hour >= 12 && hour < 18) {
            setGreetingKey('dashboard.greeting.afternoon');
        } else if (hour >= 18 || hour < 2) {
            setGreetingKey('dashboard.greeting.evening');
        } else {
            setGreetingKey('dashboard.warning.sleep');
        }
    }, []);

    return (
        <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '15px' }}>
            <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5 className="font-weight-bold mb-0">
                        {t(greetingKey).replace('{{name}}', name)} 👋
                    </h5>
                </div>
                <p className="text-muted mb-3">
                    {t('dashboard.scheduledToday').replace('{{count}}', total.toString())}
                </p>

                <div className="progress mb-2" style={{ height: '35px', borderRadius: '10px', backgroundColor: '#e9ecef', position: 'relative' }}>
                    <div
                        className="progress-bar bg-primary"
                        role="progressbar"
                        style={{ width: `${percentage}%`, borderRadius: '10px' }}
                        aria-valuenow={percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                    >
                    </div>
                    <span
                        className="position-absolute w-100 h-100 d-flex justify-content-center align-items-center text-white font-weight-bold"
                        style={{ zIndex: 1, textShadow: '0px 0px 4px rgba(0,0,0,0.3)' }}
                    >
                        {t('dashboard.completedCount')
                            .replace('{{completed}}', completed.toString())
                            .replace('{{total}}', total.toString())}
                    </span>
                </div>

                <p className="small text-muted text-center mb-0 mt-2">
                    {percentage === 100
                        ? t('dashboard.allDone')
                        : t('dashboard.keepStreak')}
                </p>
            </div>
        </div>
    );
}
