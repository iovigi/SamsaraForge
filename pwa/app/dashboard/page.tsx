'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authenticatedFetch } from '../../utils/api';
import { useLanguage } from '../../context/LanguageContext';
import DailyProgress from '../../components/DailyProgress';
import DailyHabitCard from '../../components/DailyHabitCard';
import HistoryHeatmap from '../../components/HistoryHeatmap';
import HabitStats from '../../components/HabitStats';
import confetti from 'canvas-confetti';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableHabitWrapper } from '../../components/SortableHabitWrapper';

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
    order?: number;
}

import { quotes } from '../../utils/quotes';

import NoteModal from '../../components/NoteModal';

export default function DashboardPage() {
    const { t, language } = useLanguage();
    const router = useRouter();
    const [todayHabits, setTodayHabits] = useState<Habit[]>([]);
    const [allHabits, setAllHabits] = useState<Habit[]>([]); // Store all habits for history
    const [loading, setLoading] = useState(true);
    const [completionStats, setCompletionStats] = useState({ total: 0, completed: 0 });
    const [userName, setUserName] = useState('');
    const [currentQuote, setCurrentQuote] = useState({ text: '', author: '' });

    // Stats State
    const [dashboardStats, setDashboardStats] = useState({
        totalVictories: 0,
        bestStreak: 0,
        currentStreak: 0,
        perfectDays: 0,
        heatmapData: [] as { date: string; count: number; level: number; total?: number }[]
    });

    // Note Modal State
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [activeNoteHabitId, setActiveNoteHabitId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(TouchSensor), // Default config is fine with a handle
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setTodayHabits((items) => {
                const oldIndex = items.findIndex(i => i._id === active.id);
                const newIndex = items.findIndex(i => i._id === over?.id);
                const newItems = arrayMove(items, oldIndex, newIndex);

                // Persist order
                const orderedIds = newItems.map(h => h._id);
                authenticatedFetch('/api/habits/reorder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderedIds })
                }).catch(err => console.error('Failed to save order', err));

                return newItems;
            });
        }
    };

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
                setAllHabits(data.habits);
                filterTodayHabits(data.habits);
                calculateStats(data.habits);
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

    const isScheduled = (habit: Habit, date: Date) => {
        const dayOfWeek = date.getDay(); // 0 = Sun
        const dayOfMonth = date.getDate();

        if (habit.recurrence === 'DAILY') return true;
        if (habit.recurrence === 'WEEKLY' && habit.weekDays?.includes(dayOfWeek)) return true;
        if (habit.recurrence === 'MONTHLY' && habit.monthDay === dayOfMonth) return true;
        if (habit.recurrence === 'ONCE' && habit.scheduledDate) {
            const sDate = new Date(habit.scheduledDate);
            return sDate.getFullYear() === date.getFullYear() &&
                sDate.getMonth() === date.getMonth() &&
                sDate.getDate() === date.getDate();
        }
        return false;
    };

    const isCompletedToday = (habit: Habit) => {
        // Also check status as a fallback source of truth?
        // If status is TODO, it definitively means it's not done for the current cycle.
        if (habit.status === 'TODO') return false;

        const now = new Date();
        return habit.completionDates?.some(d => {
            const date = new Date(d);
            return date.getDate() === now.getDate() &&
                date.getMonth() === now.getMonth() &&
                date.getFullYear() === now.getFullYear();
        });
    };

    const updateStats = (habits: Habit[]) => {
        const total = habits.length;
        const completed = habits.filter(h => isCompletedToday(h)).length;
        setCompletionStats({ total, completed });
    };

    const filterTodayHabits = (allHabits: Habit[]) => {
        const today = new Date();
        const dateString = today.toISOString().split('T')[0];

        const todays = allHabits.filter(habit => {
            // 1. Check if explicitly completed today already (show it as done)
            const isCompletedTodayCheck = habit.completionDates?.some(d => d.startsWith(dateString));
            if (isCompletedTodayCheck) return true;

            // 2. Check scheduling rules
            return isScheduled(habit, today);
        });

        // Sort: Pending first, then Done. Then by Order.
        todays.sort((a, b) => {
            const aDone = isCompletedToday(a);
            const bDone = isCompletedToday(b);
            if (aDone !== bDone) {
                return aDone ? 1 : -1;
            }
            // If status is same, sort by order
            return (a.order || 0) - (b.order || 0);
        });

        setTodayHabits(todays);
        updateStats(todays);
    };

    const toggleComplete = async (habit: Habit) => {
        const wasCompleted = isCompletedToday(habit);
        const newStatus: 'DONE' | 'TODO' = wasCompleted ? 'TODO' : 'DONE';

        // Optimistic Update
        const updatedHabits = todayHabits.map(h => {
            if (h._id === habit._id) {
                const now = new Date();
                // Local ISO-like string
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const todayStr = `${year}-${month}-${day}`;

                // Helper to generate full ISO string with local offset preservation if needed, 
                // but completionDates usually stored as ISO UTC in backend?
                // Actually backend effectively stores `new Date()`.
                // For optimistic UI, let's just use standard ISO but we rely on the prefix check above.
                // Wait, if we push standard ISO (UTC), and check with Local, we might differ again if near midnight.
                // It is safer to trust the 'status' toggle for the immediate optimistic render.

                let newDates = h.completionDates || [];
                let newStreak = h.streak;

                if (!wasCompleted) {
                    // Completing
                    newDates = [...newDates, new Date().toISOString()];
                    if (h.recurrence !== 'ONCE') {
                        // Assuming valid for streak if not already done today
                        // We strictly increment for visual feedback, API will confirm
                        const lastCompleted = h.completionDates && h.completionDates.length > 0
                            ? new Date(h.completionDates[h.completionDates.length - 1])
                            : null;

                        const isSameDay = lastCompleted &&
                            lastCompleted.toISOString().split('T')[0] === todayStr;

                        if (!isSameDay) {
                            newStreak = (newStreak || 0) + 1;
                        }
                    }
                } else {
                    // Undoing
                    newDates = newDates.filter(d => !d.startsWith(todayStr));
                    if (h.recurrence !== 'ONCE') {
                        // Rough decrement logic, actual logic is complex (need lookup previous streak)
                        // For now we just decrement, API correction will happen on re-fetch or response
                        newStreak = Math.max(0, (newStreak || 0) - 1);
                    }
                }
                return { ...h, completionDates: newDates, streak: newStreak, status: newStatus };
            }
            return h;
        });

        setTodayHabits(updatedHabits);
        updateStats(updatedHabits);

        if (!wasCompleted) {
            triggerConfetti();
        }

        try {
            const res = await authenticatedFetch(`/api/habits/${habit._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: newStatus
                }),
            });

            if (res.ok) {
                const data = await res.json();
                // Update with server source of truth (correct streak, dates etc)
                setTodayHabits(prev => prev.map(h =>
                    h._id === habit._id ? { ...h, ...data.habit } : h
                ));
                // Update allHabits too to reflect changes in stats immediately
                const updatedAll = allHabits.map(h => h._id === habit._id ? { ...h, ...data.habit } : h);
                setAllHabits(updatedAll);
                calculateStats(updatedAll);
            }
        } catch (error) {
            console.error("Failed to update habit", error);
            // Revert on error? For now just log.
            fetchHabits();
        }
    };

    const triggerConfetti = () => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    };

    const handleOpenNote = (habitId: string) => {
        setActiveNoteHabitId(habitId);
        setIsNoteModalOpen(true);
    };

    const handleSaveNote = async (text: string) => {
        if (!activeNoteHabitId) return;

        try {
            await authenticatedFetch(`/api/habits/${activeNoteHabitId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });
            // Optional: Show success toast
        } catch (error) {
            console.error('Failed to save note', error);
        }
    };

    const calculateStats = (habits: Habit[]) => {
        let totalVictories = 0;
        let maxStreak = 0;
        let runningStreakSum = 0; // Sum of current streaks of all active habits? Or just best single streak?
        // User asked: "suming for multple days" -> maybe total active streaks?
        // Let's go with Best Streak (Single max) and Current Streak (Sum of all streaks? No, that's weird).
        // Let's show: Total Victories, MAX Streak (of any habit), Current Streak (of any habit? or sum?)
        // Let's implement Sum of Streaks for "Active Streaks" (from localization) or "Current Streak" if singular.

        // Date map for heatmap
        const dateCounts: { [key: string]: number } = {};

        habits.forEach(h => {
            totalVictories += (h.completionDates?.length || 0);
            if (h.streak > maxStreak) maxStreak = h.streak;
            // runningStreakSum += h.streak; // If we want sum

            h.completionDates?.forEach(dateStr => {
                const d = dateStr.split('T')[0];
                dateCounts[d] = (dateCounts[d] || 0) + 1;
            });
        });

        // Current Streak context: usually "Longest current streak". 
        // Let's calculate "Longest Current Streak" across all habits.
        // Actually locally I have `streak` on habit.

        let perfectDays = 0;
        const heatmapData = [];
        const todayStr = new Date().toISOString().split('T')[0];

        // Fill heatmap (last 365 days? ActivityCalendar handles range, just need data)
        // Activity Calendar expects one year usually or it auto-scales.
        // We just pass the sparse data we have? No, it needs array.
        // actually react-activity-calendar handles sparse data if start/end not provided? 
        // We should map Object to Array.

        // Generate a dense list of dates for the last 2 years (to allow previous year navigation)
        const now = new Date();
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(now.getFullYear() - 2);

        // Iterate day by day from twoYearsAgo to today
        let loopDate = new Date(twoYearsAgo);
        // Reset to midnight for consistent comparison
        loopDate.setHours(0, 0, 0, 0);

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        while (loopDate <= todayEnd) {
            const y = loopDate.getFullYear();
            const m = loopDate.getMonth() + 1;
            const dNum = loopDate.getDate();
            const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;

            const count = dateCounts[dateStr] || 0;

            // Check scheduling for this specific historic date
            // Note: loopDate is already a Date object set to local time midnight (or whatever system local is)
            const totalForDay = habits.filter(h => isScheduled(h, loopDate)).length;

            // Percentage-based level logic
            let level = 0;
            if (count > 0 && totalForDay > 0) {
                const percentage = count / totalForDay;
                if (percentage <= 0.25) level = 1;
                else if (percentage <= 0.50) level = 2;
                else if (percentage <= 0.75) level = 3;
                else level = 4;
            } else if (count > 0 && totalForDay === 0) {
                // If counting completions but no scheduled habits (e.g. recurrence changed), treat as max or level 1?
                // Let's settle on level 1 for safety, or higher if high count.
                // Or maybe just based on count raw value? 1->1, 2->2, 3->3, 4+->4
                if (count === 1) level = 1;
                else if (count === 2) level = 2;
                else if (count === 3) level = 3;
                else level = 4;
            } else if (count === 0 && totalForDay > 0) {
                // 0 completed, but some scheduled -> Level 0.
                level = 0;
            }

            if (count >= 5) perfectDays++; // Keep legacy perfect day logic

            heatmapData.push({ date: dateStr, count, level, total: totalForDay });

            // Increment day
            loopDate.setDate(loopDate.getDate() + 1);
        }

        // Add today if missing (with 0) to ensure calendar goes up to today? 
        // Calendar usually handles this.

        setDashboardStats({
            totalVictories,
            bestStreak: maxStreak,
            currentStreak: maxStreak, // For now, Best Streak and Current Streak might be same if we don't distinguish "Historical Best". 
            // The model stores 'streak' which is current. 
            // So 'Best Streak' implies 'Longest Streak Ever'. We don't track historical max in model yet. 
            // So we'll show "Best Streak" as the highest current streak among all habits.
            perfectDays,
            heatmapData
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
            <div style={{ height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <section className="content pt-4 pb-5">
                    <div className="container-fluid">
                        <div className="row justify-content-center">
                            <div className="col-12 col-md-10 col-lg-8"> {/* Widened slightly for Heatmap */}

                                {/* 1. Header & Progress */}
                                <DailyProgress
                                    completed={completionStats.completed}
                                    total={completionStats.total}
                                    userName={userName}
                                />

                                {/* 2. Today's List */}
                                <h5 className="mb-3 pl-1 font-weight-bold text-dark">{t('dashboard.today')}</h5>

                                {todayHabits.length > 0 ? (
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <div style={{ touchAction: 'none' }}>
                                            <SortableContext
                                                items={todayHabits.map(h => h._id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                {todayHabits.map(habit => (
                                                    <SortableHabitWrapper key={habit._id} id={habit._id}>
                                                        {(listeners: any) => (
                                                            <DailyHabitCard
                                                                title={habit.title}
                                                                description={habit.description}
                                                                status={isCompletedToday(habit) ? 'DONE' : 'TODO'}
                                                                onComplete={() => toggleComplete(habit)}
                                                                type={habit.description?.toLowerCase().includes('timer') ? 'TIMED' : 'SIMPLE'}
                                                                streak={habit.streak}
                                                                onAddNote={() => handleOpenNote(habit._id)}
                                                                timeFrame={habit.timeFrame}
                                                                dragListeners={listeners}
                                                            />
                                                        )}
                                                    </SortableHabitWrapper>
                                                ))}
                                            </SortableContext>
                                        </div>
                                    </DndContext>
                                ) : (
                                    <div className="text-center py-5 text-muted">
                                        <i className="fas fa-mug-hot fa-3x mb-3 text-secondary" style={{ opacity: 0.5 }}></i>
                                        <p>{t('dashboard.noHabits')}</p>
                                        <a href="/habits" className="btn btn-sm btn-outline-primary mt-2">{t('dashboard.manageHabits')}</a>
                                    </div>
                                )}

                                {/* 3. Stats & Heatmap */}
                                <div className="mt-5">
                                    <h5 className="mb-3 pl-1 font-weight-bold text-dark">{t('dashboard.totalVictories')}</h5> {/* Using title for section */}
                                    <HabitStats
                                        totalVictories={dashboardStats.totalVictories}
                                        bestStreak={dashboardStats.bestStreak}
                                        currentStreak={dashboardStats.currentStreak}
                                        perfectDays={dashboardStats.perfectDays}
                                    />
                                    <HistoryHeatmap data={dashboardStats.heatmapData} />
                                </div>

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
            </div >

            <NoteModal
                isOpen={isNoteModalOpen}
                onClose={() => setIsNoteModalOpen(false)}
                onSave={handleSaveNote}
                title={todayHabits.find(h => h._id === activeNoteHabitId)?.title}
            />
        </div >
    );
}
