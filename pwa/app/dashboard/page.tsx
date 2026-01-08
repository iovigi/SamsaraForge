'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ActivityCalendar } from 'react-activity-calendar';
import { authenticatedFetch } from '../../utils/api';
import { useLanguage } from '../../context/LanguageContext';

interface Habit {
    _id: string;
    title: string;
    description: string;
    status: 'TODO' | 'IN_PROGRESS' | 'DONE';
    recurrence: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'; // Added to interface
    streak: number;
    completionDates: string[]; // ISO Date strings
}

export default function DashboardPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const [habits, setHabits] = useState<Habit[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalHabits: 0,
        activeStreaks: 0,
        totalCompletions: 0,
    });
    const [calendarData, setCalendarData] = useState<any[]>([]);

    useEffect(() => {
        const fetchHabits = async () => {
            try {
                const res = await authenticatedFetch('/api/habits');
                if (res.ok) {
                    const data = await res.json();
                    setHabits(data.habits);
                    calculateStats(data.habits);
                } else {
                    // If auth fails, redirect to login
                    if (res.status === 401) router.push('/auth/login');
                }
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHabits();
    }, []);

    const calculateStats = (habitList: Habit[]) => {
        let totalH = habitList.length;
        let activeS = 0;
        let totalC = 0;
        const dateMap: Record<string, number> = {};

        console.log('Calculating Stats for Habits:', habitList);

        habitList.forEach(habit => {
            // Only count streak if it's > 0 AND not a one-time task
            if (habit.streak > 0 && habit.recurrence !== 'ONCE') activeS++;

            const dates = habit.completionDates || [];
            if (dates.length > 0) {
                totalC += dates.length;
                dates.forEach(dateStr => {
                    // Extract YYYY-MM-DD
                    const date = new Date(dateStr).toISOString().split('T')[0];
                    dateMap[date] = (dateMap[date] || 0) + 1;
                });
            }
        });

        // Format for ActivityCalendar
        // Needs last 365 days mostly, or dynamic. 
        // We'll just map the dateMap to array.
        const calendar = Object.entries(dateMap).map(([date, count]) => ({
            date,
            count,
            level: Math.min(count, 4) as 0 | 1 | 2 | 3 | 4, // Simple scaling
        })).sort((a, b) => a.date.localeCompare(b.date));

        // Ensure we have at least one entry to avoid calendar crashes if empty
        if (calendar.length === 0) {
            const today = new Date().toISOString().split('T')[0];
            calendar.push({ date: today, count: 0, level: 0 });
        }

        setStats({
            totalHabits: totalH,
            activeStreaks: activeS,
            totalCompletions: totalC
        });
        setCalendarData(calendar);
    };

    if (loading) {
        return (
            <div className="content-wrapper d-flex justify-content-center align-items-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="content-wrapper">
            {/* Content Header */}
            <div className="content-header">
                <div className="container-fluid">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1 className="m-0">{t('nav.dashboard')}</h1>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <section className="content">
                <div className="container-fluid">
                    {/* Stats Boxes */}
                    <div className="row">
                        <div className="col-lg-4 col-6">
                            <div className="small-box bg-info">
                                <div className="inner">
                                    <h3>{stats.totalHabits}</h3>
                                    <p>{t('dashboard.totalHabits')}</p>
                                </div>
                                <div className="icon">
                                    <i className="fas fa-tasks"></i>
                                </div>
                                <a href="/habits" className="small-box-footer">
                                    {t('dashboard.goToBoard')} <i className="fas fa-arrow-circle-right"></i>
                                </a>
                            </div>
                        </div>
                        <div className="col-lg-4 col-6">
                            <div className="small-box bg-success">
                                <div className="inner">
                                    <h3>{stats.activeStreaks}</h3>
                                    <p>{t('dashboard.activeStreaks')}</p>
                                </div>
                                <div className="icon">
                                    <i className="fas fa-fire"></i>
                                </div>
                                <a href="/habits" className="small-box-footer">
                                    {t('dashboard.viewHabits')} <i className="fas fa-arrow-circle-right"></i>
                                </a>
                            </div>
                        </div>
                        <div className="col-lg-4 col-6">
                            <div className="small-box bg-warning">
                                <div className="inner">
                                    <h3>{stats.totalCompletions}</h3>
                                    <p>{t('dashboard.totalVictories')}</p>
                                </div>
                                <div className="icon">
                                    <i className="fas fa-trophy"></i>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Activity Calendar Card */}
                    <div className="row mt-4">
                        <div className="col-12">
                            <div className="card">
                                <div className="card-header border-0">
                                    <h3 className="card-title">
                                        <i className="far fa-calendar-alt mr-1"></i>
                                        {t('dashboard.globalHistory')}
                                    </h3>
                                </div>
                                <div className="card-body pt-0 d-flex justify-content-center">
                                    <div style={{ width: '100%', overflowX: 'auto' }}>
                                        <ActivityCalendar
                                            data={calendarData}
                                            theme={{
                                                light: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
                                                dark: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
                                            }}
                                            labels={{
                                                legend: {
                                                    less: t('dashboard.less'),
                                                    more: t('dashboard.more'),
                                                },
                                                months: [
                                                    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                                                ],
                                                totalCount: t('dashboard.victoriesInYear'),
                                                weekdays: [
                                                    'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
                                                ]
                                            }}
                                            colorScheme="light"
                                            blockSize={12}
                                            blockMargin={5}
                                            fontSize={14}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Motivation Quote / Clean layout */}
                    <div className="row">
                        <div className="col-12 text-center mt-5 text-muted">
                            <p className="font-italic">{t('dashboard.quote')}</p>
                            <small>{t('dashboard.quoteAuthor')}</small>
                        </div>
                    </div>

                </div>
            </section>
        </div>
    );
}
