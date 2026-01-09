
'use client';

import { useState, useEffect } from 'react';
import TaskModal from './TaskModal';
import { useRouter, useSearchParams } from 'next/navigation';
import { authenticatedFetch } from '../utils/api';
import { DndContext, useDraggable, useDroppable, DragEndEvent, DragStartEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useLanguage } from '../context/LanguageContext';
import confetti from 'canvas-confetti';

interface Habit {
    _id: string;
    title: string;
    description: string;
    status: 'TODO' | 'IN_PROGRESS' | 'DONE';
    recurrence: string;
    timeFrame: {
        start: string;
        end: string;
    };
    reminderCron: string;
    streak: number;
}

export default function HabitBoard() {
    const { t } = useLanguage();
    const [habits, setHabits] = useState<Habit[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentHabit, setCurrentHabit] = useState<Habit | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null); // Track active drag item

    // Mobile Tabs State
    const [activeTab, setActiveTab] = useState<'TODO' | 'IN_PROGRESS' | 'DONE'>('TODO');

    const router = useRouter();
    const searchParams = useSearchParams();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const fetchHabits = async () => {
        try {
            const res = await authenticatedFetch('/api/habits');
            if (res.ok) {
                const data = await res.json();
                setHabits(data.habits);
                return data.habits; // Return for chaining
            }
        } catch (error) {
            console.error('Error fetching habits:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            const loadedHabits = await fetchHabits();

            // Check for deep link
            const openTaskId = searchParams.get('openTask');
            if (openTaskId && loadedHabits) {
                const targetHabit = loadedHabits.find((h: Habit) => h._id === openTaskId);
                if (targetHabit) {
                    setCurrentHabit(targetHabit);
                    setIsModalOpen(true);
                }
            }
        };
        init();
    }, [searchParams]);

    const updateHabitState = (habit: Habit) => {
        setHabits(prev => {
            const exists = prev.find(h => h._id === habit._id);
            if (exists) {
                return prev.map(h => h._id === habit._id ? habit : h);
            }
            return [habit, ...prev];
        });
    };

    const handleHabitSave = (habit: Habit) => {
        updateHabitState(habit);
        setIsModalOpen(false);
        fetchHabits();
    };

    const handleDelete = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!confirm(t('kanban.deleteConfirm'))) return;
        await authenticatedFetch(`/api/habits/${id}`, { method: 'DELETE' });
        setHabits(prev => prev.filter(h => h._id !== id));
    };

    const openModal = (habit?: Habit) => {
        setCurrentHabit(habit || null);
        setIsModalOpen(true);
    };

    const moveHabit = async (habit: Habit, newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
        if (habit.status === newStatus) return;

        // Optimistic UI
        setHabits(prev => prev.map(h => h._id === habit._id ? { ...h, status: newStatus } : h));

        // Trigger Confetti if moved to DONE
        if (newStatus === 'DONE') {
            triggerConfetti();
        }

        await authenticatedFetch(`/api/habits/${habit._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        });
    };

    const triggerConfetti = () => {
        const duration = 2 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

        const random = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: random(0.1, 0.3), y: random(0.3, 0.4) } });
            confetti({ ...defaults, particleCount, origin: { x: random(0.7, 0.9), y: random(0.3, 0.4) } });
        }, 250);
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const habitId = active.id as string;
            // The droppable ID is the status string directly
            const newStatus = over.id as 'TODO' | 'IN_PROGRESS' | 'DONE';

            const habit = habits.find(h => h._id === habitId);
            // Ensure we are dragging to a valid different status column
            if (habit && (['TODO', 'IN_PROGRESS', 'DONE'].includes(newStatus))) {
                moveHabit(habit, newStatus);
            }
        }
        setActiveId(null);
    };

    const filterHabits = (status: string) => habits.filter(h => h.status === status);
    const activeHabit = activeId ? habits.find(h => h._id === activeId) : null;

    return (
        <section className="kanban-container">
            <div className="container-fluid h-100 d-flex flex-column">
                {/* Mobile Tabs */}
                <div className="d-block d-md-none mb-4">
                    <ul className="nav nav-pills justify-content-center">
                        {['TODO', 'IN_PROGRESS', 'DONE'].map((status) => {
                            let label = '';
                            if (status === 'TODO') label = t('kanban.todo');
                            else if (status === 'IN_PROGRESS') label = t('kanban.inProgress');
                            else if (status === 'DONE') label = t('kanban.done');

                            return (
                                <li className="nav-item" key={status}>
                                    <a
                                        className={`nav-link ${activeTab === status ? 'active' : ''} ${status === 'DONE' && activeTab === 'DONE' ? 'bg-success' : ''}`}
                                        onClick={() => setActiveTab(status as any)}
                                        style={{ cursor: 'pointer', borderRadius: '20px', padding: '0.5rem 1.5rem', fontWeight: 600 }}
                                    >
                                        {label}
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <div className="row flex-grow-1">
                        {/* TODO Column */}
                        <div className={`col-12 col-md-4 ${activeTab === 'TODO' ? 'd-block' : 'd-none d-md-block'}`}>
                            <DroppableColumn id="TODO" title={t('kanban.todo')} icon="fas fa-list-ul" color="#6366f1">
                                {filterHabits('TODO').map(habit => (
                                    <DraggableTaskCard
                                        key={habit._id}
                                        task={habit}
                                        onEdit={() => openModal(habit)}
                                        onDelete={() => handleDelete(habit._id)}
                                        onMove={(newStatus: any) => {
                                            moveHabit(habit, newStatus);
                                            setActiveTab(newStatus);
                                        }}
                                    />
                                ))}
                            </DroppableColumn>
                        </div>

                        {/* IN_PROGRESS Column (Focus Mode) */}
                        <div className={`col-12 col-md-4 ${activeTab === 'IN_PROGRESS' ? 'd-block' : 'd-none d-md-block'}`}>
                            <div className="h-100 column-focus-mode">
                                <DroppableColumn id="IN_PROGRESS" title={t('kanban.inProgress')} icon="fas fa-bullseye" color="#ec4899">
                                    {filterHabits('IN_PROGRESS').map(habit => (
                                        <DraggableTaskCard
                                            key={habit._id}
                                            task={habit}
                                            onEdit={() => openModal(habit)}
                                            onDelete={() => handleDelete(habit._id)}
                                            onMove={(newStatus: any) => {
                                                moveHabit(habit, newStatus);
                                                setActiveTab(newStatus);
                                            }}
                                        />
                                    ))}
                                </DroppableColumn>
                            </div>
                        </div>

                        {/* DONE Column */}
                        <div className={`col-12 col-md-4 ${activeTab === 'DONE' ? 'd-block' : 'd-none d-md-block'}`}>
                            <DroppableColumn id="DONE" title={t('kanban.done')} icon="fas fa-check-circle" color="#22c55e">
                                {filterHabits('DONE').map(habit => (
                                    <DraggableTaskCard
                                        key={habit._id}
                                        task={habit}
                                        onEdit={() => openModal(habit)}
                                        onDelete={() => handleDelete(habit._id)}
                                        onMove={(newStatus: any) => {
                                            moveHabit(habit, newStatus);
                                            setActiveTab(newStatus);
                                        }}
                                    />
                                ))}
                            </DroppableColumn>
                        </div>
                    </div>

                    <DragOverlay>
                        {activeHabit ? (
                            <div className="habit-card dragging">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                    <h5 className="habit-title mb-0">{activeHabit.title}</h5>
                                </div>
                                <p className="habit-desc">{activeHabit.description}</p>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>

            {/* Floating Action Button */}
            {!isModalOpen && (
                <button
                    className="btn btn-primary rounded-circle custom-fab"
                    style={{
                        position: 'fixed',
                        bottom: '2rem',
                        right: '2rem',
                        width: '64px',
                        height: '64px',
                        fontSize: '28px',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    onClick={() => openModal()}
                >
                    <i className="fas fa-plus"></i>
                </button>
            )}

            {isModalOpen && (
                <TaskModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    task={currentHabit}
                    onSave={handleHabitSave}
                    onUpdate={updateHabitState}
                />
            )}
        </section >
    );
}

function DroppableColumn({ id, title, children, icon, color }: any) {
    const { setNodeRef } = useDroppable({ id });
    return (
        <div className="kanban-column h-100 d-flex flex-column">
            <div className="kanban-column-header">
                <i className={icon} style={{ color: color }}></i>
                {title}
                <span className="badge badge-light ml-auto" style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                    {children.length}
                </span>
            </div>
            <div ref={setNodeRef} className="flex-grow-1" style={{ minHeight: '200px' }}>
                {children.length > 0 ? children : (
                    <div className="empty-placeholder">
                        <i className={`${icon} fa-2x mb-3`}></i>
                        <p className="mb-0">No habits here yet</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function DraggableTaskCard({ task, onEdit, onDelete, onMove }: any) {
    const { t } = useLanguage();
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task._id,
    });
    const style = {
        transform: transform ? CSS.Translate.toString(transform) : undefined,
    } as React.CSSProperties;

    // Helper to translate recurrence key safely
    const recurrenceLabel = task.recurrence
        ? t(`kanban.${task.recurrence.toLowerCase()}` as any) || task.recurrence
        : '';

    // Expiration Logic
    const isExpiring = (() => {
        if (task.status === 'DONE' || !task.timeFrame?.end) return false;
        const now = new Date();
        const [endH, endM] = task.timeFrame.end.split(':').map(Number);
        const deadline = new Date();
        deadline.setHours(endH, endM, 0, 0);

        // If deadline is earlier today, it's overdue (or just past due). 
        // If deadline is later today, calc diff.
        const diffMs = deadline.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        // Warning if within 3 hours and positive
        return diffHours > 0 && diffHours < 3;
    })();

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`habit-card ${isDragging ? 'dragging' : ''} ${isExpiring ? 'streak-risk' : ''}`}
            onClick={onEdit}
        >
            <div className="d-flex justify-content-between align-items-start mb-2">
                <h5 className="habit-title mb-0">{task.title}</h5>
                {task.streak > 0 && task.recurrence !== 'ONCE' && (
                    <div className={`streak-badge ${task.streak > 7 ? 'high-streak' : ''}`}>
                        <i className="fas fa-fire"></i>
                        <span>{task.streak}</span>
                    </div>
                )}
            </div>

            <p className="habit-desc text-truncate">{task.description}</p>

            <div className="d-flex align-items-center justify-content-between mt-3">
                <div className="d-flex align-items-center flex-wrap">
                    <span className="meta-tag">
                        <i className="far fa-clock mr-1"></i> {recurrenceLabel}
                    </span>
                    {task.timeFrame?.start && (
                        <span className="meta-tag">
                            <i className="far fa-hourglass mr-1"></i> {task.timeFrame.start}
                        </span>
                    )}

                    {/* Expiration Text */}
                    {isExpiring && (
                        <span className="text-danger font-weight-bold ml-2" style={{ fontSize: '0.75rem' }}>
                            <i className="fas fa-exclamation-triangle mr-1"></i> {t('kanban.expiresSoon')}
                        </span>
                    )}
                </div>

                <div className="card-tools">
                    {/* Move Dropdown (Mobile Friendly) */}
                    <div className="btn-group">
                        <button type="button" className="btn btn-tool dropdown-toggle" data-toggle="dropdown" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); }}>
                            <i className="fas fa-ellipsis-h text-secondary"></i>
                        </button>
                        <div className="dropdown-menu dropdown-menu-right" role="menu">
                            <span className="dropdown-item-text text-muted">Move to:</span>
                            {task.status !== 'TODO' && (
                                <a className="dropdown-item" href="#" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMove('TODO'); }}>
                                    {t('kanban.todo')}
                                </a>
                            )}
                            {task.status !== 'IN_PROGRESS' && (
                                <a className="dropdown-item" href="#" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMove('IN_PROGRESS'); }}>
                                    {t('kanban.inProgress')}
                                </a>
                            )}
                            {task.status !== 'DONE' && (
                                <a className="dropdown-item" href="#" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMove('DONE'); }}>
                                    {t('kanban.done')}
                                </a>
                            )}
                            <div className="dropdown-divider"></div>
                            <a className="dropdown-item text-danger" href="#" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}>
                                <i className="fas fa-trash mr-2"></i> {t('common.delete')}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
