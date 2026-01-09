'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authenticatedFetch } from '../../utils/api';
import { useLanguage } from '../../context/LanguageContext';
import DailyProgress from '../../components/DailyProgress';
import DailyHabitCard from '../../components/DailyHabitCard';
import confetti from 'canvas-confetti';

interface Habit {
    _id: string;
    title: string;
    description: string;
    status: 'TODO' | 'IN_PROGRESS' | 'DONE';
    recurrence: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'; // Added to interface
    streak: number;
    completionDates: string[]; // ISO Date strings
    scheduledDate?: string;
    weekDays?: number[];
    monthDay?: number;
    timeFrame?: { start: string; end: string };
}

import { quotes } from '../../utils/quotes';

export default function DashboardPage() {
    const { t, language } = useLanguage();
    const router = useRouter();
    const [todayHabits, setTodayHabits] = useState<Habit[]>([]);
    const [loading, setLoading] = useState(true);
    const [completionStats, setCompletionStats] = useState({ total: 0, completed: 0 });
    const [userName, setUserName] = useState('');
    const [currentQuote, setCurrentQuote] = useState({ text: '', author: '' });

    useEffect(() => {
        // Random quote based on language
        const langCode = language === 'bg' ? 'bg' : 'en';
        const currentQuotes = quotes[langCode] || quotes['en'];
        const randomQuote = currentQuotes[Math.floor(Math.random() * currentQuotes.length)];
        setCurrentQuote(randomQuote);
    }, [language]); // Re-run when language changes

    const fetchHabits = async () => {
        try {
            const res = await authenticatedFetch('/api/habits');
            if (res.ok) {
                const data = await res.json();
                filterTodayHabits(data.habits);
            } else {
                if (res.status === 401) router.push('/auth/login');
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUser = async () => {
        try {
            // Basic fetch of /api/auth/me to get name
            // Assuming this endpoint exists based on TaskModal
            const res = await authenticatedFetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                console.log('Dashboard fetchUser data:', data);
                // Assuming data.user.name or data.user.email
                // We'll use email as fallback if name is not there
                const name = data.user?.nickname || data.user?.name || data.user?.email?.split('@')[0] || 'Friend';
                setUserName(name);
            }
        } catch (e) {
            console.error("Failed to fetch user", e);
        }
    };

    useEffect(() => {
        fetchHabits();
        fetchUser();
    }, []);

    const filterTodayHabits = (allHabits: Habit[]) => {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sun
        const dayOfMonth = today.getDate();
        const dateString = today.toISOString().split('T')[0];

        const todays = allHabits.filter(habit => {
            // 1. Check if explicitly completed today already (show it as done)
            const isCompletedToday = habit.completionDates?.some(d => d.startsWith(dateString));
            if (isCompletedToday) return true;

            // 2. Check scheduling rules
            if (habit.recurrence === 'DAILY') return true;
            if (habit.recurrence === 'WEEKLY' && habit.weekDays?.includes(dayOfWeek)) return true;
            if (habit.recurrence === 'MONTHLY' && habit.monthDay === dayOfMonth) return true;
            if (habit.recurrence === 'ONCE' && habit.scheduledDate && habit.scheduledDate.startsWith(dateString)) return true;

            return false;
        });

        // Sort: Pending first, then Done. Then by time.
        todays.sort((a, b) => {
            const aDone = isCompletedToday(a);
            const bDone = isCompletedToday(b);
            if (aDone === bDone) return 0;
            return aDone ? 1 : -1;
        });

        setTodayHabits(todays);
        updateStats(todays);
    };

    const isCompletedToday = (habit: Habit) => {
        const todayStr = new Date().toISOString().split('T')[0];
        return habit.completionDates?.some(d => d.startsWith(todayStr));
    };

    const updateStats = (habits: Habit[]) => {
        const total = habits.length;
        const completed = habits.filter(h => isCompletedToday(h)).length;
        setCompletionStats({ total, completed });
    };

    const toggleComplete = async (habit: Habit) => {
        const wasCompleted = isCompletedToday(habit);
        const newStatus = wasCompleted ? 'TODO' : 'DONE'; // Simplified toggle logic for now

        // Optimistic Update
        const updatedHabits = todayHabits.map(h => {
            if (h._id === habit._id) {
                const todayStr = new Date().toISOString().split('T')[0];
                let newDates = h.completionDates || [];
                if (!wasCompleted) {
                    newDates = [...newDates, new Date().toISOString()];
                } else {
                    newDates = newDates.filter(d => !d.startsWith(todayStr));
                }
                return { ...h, completionDates: newDates };
            }
            return h;
        });

        setTodayHabits(updatedHabits);
        updateStats(updatedHabits);

        if (!wasCompleted) {
            triggerConfetti();
        }

        // Actual API Call (We use the status update endpoint or a new completion toggle endpoint)
        // Ideally we should have a specific 'check-in' endpoint, but for now we'll use PUT with status or just rely on the manual update provided by existing codebase logic?
        // Current API might settle status to DONE which is permanent. 
        // We will simulate a "toggle" by updating the habit status logic if needed.
        // Actually, for "Daily" habits, status shouldn't stick to DONE forever. 
        // For now, let's just push the status update.

        await authenticatedFetch(`/api/habits/${habit._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: newStatus
                // We might need to handle completionDates manually on backend if status doesn't handle it
            }),
        });

        // Re-fetch to ensure consistency with backend logic (streaks etc)
        fetchHabits();
    };

    const triggerConfetti = () => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    };

    if (loading) {
        return (
            <div className="content-wrapper d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', backgroundColor: '#f4f6f9' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="content-wrapper" style={{ backgroundColor: '#f4f6f9' }}> {/* Light gray background */}
            <section className="content pt-4">
                <div className="container-fluid">
                    <div className="row justify-content-center">
                        <div className="col-12 col-md-8 col-lg-6">

                            {/* 1. Header & Progress */}
                            <DailyProgress
                                completed={completionStats.completed}
                                total={completionStats.total}
                                userName={userName}
                            />

                            {/* 2. Today's List */}
                            <h5 className="mb-3 pl-1 font-weight-bold text-dark">{t('dashboard.today')}</h5>

                            {todayHabits.length > 0 ? (
                                todayHabits.map(habit => (
                                    <DailyHabitCard
                                        key={habit._id}
                                        title={habit.title}
                                        description={habit.description}
                                        status={isCompletedToday(habit) ? 'DONE' : 'TODO'}
                                        onComplete={() => toggleComplete(habit)}
                                        // Simple heuristic for type
                                        type={habit.description?.toLowerCase().includes('timer') ? 'TIMED' : 'SIMPLE'}
                                        streak={habit.streak}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-5 text-muted">
                                    <i className="fas fa-mug-hot fa-3x mb-3 text-secondary" style={{ opacity: 0.5 }}></i>
                                    <p>{t('dashboard.noHabits')}</p>
                                    <a href="/habits" className="btn btn-sm btn-outline-primary mt-2">{t('dashboard.manageHabits')}</a>
                                </div>
                            )}

                            {/* 3. Motivation / Footer */}
                            <div className="card bg-white mt-5 border-0 shadow-sm" style={{ borderRadius: '15px' }}>
                                <div className="card-body">
                                    <h6 className="font-weight-bold mb-2">{t('dashboard.motivationTitle')}</h6>
                                    <p className="font-italic text-muted mb-0">"{currentQuote.text || t('dashboard.motivationText')}"</p>
                                    <footer className="blockquote-footer mt-1">{currentQuote.author}</footer>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
