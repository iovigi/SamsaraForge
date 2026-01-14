'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authenticatedFetch } from '../../utils/api';
import { useLanguage } from '../../context/LanguageContext';
import DailyProgress from '../../components/DailyProgress';
import DailyHabitCard from '../../components/DailyHabitCard';
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
    const [loading, setLoading] = useState(true);
    const [completionStats, setCompletionStats] = useState({ total: 0, completed: 0 });
    const [userName, setUserName] = useState('');
    const [currentQuote, setCurrentQuote] = useState({ text: '', author: '' });

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
            if (habit.recurrence === 'ONCE' && habit.scheduledDate) {
                const sDate = new Date(habit.scheduledDate);
                if (sDate.getDate() === dayOfMonth &&
                    sDate.getMonth() === today.getMonth() &&
                    sDate.getFullYear() === today.getFullYear()) {
                    return true;
                }
            }

            return false;
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
            <section className="content pt-4 pb-5">
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

            <NoteModal
                isOpen={isNoteModalOpen}
                onClose={() => setIsNoteModalOpen(false)}
                onSave={handleSaveNote}
                title={todayHabits.find(h => h._id === activeNoteHabitId)?.title}
            />
        </div>
    );
}
