
'use client';

import { useState, useEffect } from 'react';
import TaskModal from './TaskModal';
import { useRouter } from 'next/navigation';
import { authenticatedFetch } from '../utils/api';
import { DndContext, useDraggable, useDroppable, DragEndEvent, DragStartEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useLanguage } from '../context/LanguageContext';

interface Task {
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
}

export default function KanbanBoard() {
    const { t } = useLanguage();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTask, setCurrentTask] = useState<Task | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null); // Track active drag item

    // Mobile Tabs State
    const [activeTab, setActiveTab] = useState<'TODO' | 'IN_PROGRESS' | 'DONE'>('TODO');

    const router = useRouter();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const fetchTasks = async () => {
        try {
            const res = await authenticatedFetch('/api/tasks');
            if (res.ok) {
                const data = await res.json();
                setTasks(data.tasks);
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const updateTaskState = (task: Task) => {
        setTasks(prev => {
            const exists = prev.find(t => t._id === task._id);
            if (exists) {
                return prev.map(t => t._id === task._id ? task : t);
            }
            return [task, ...prev];
        });
        // fetchTasks(); // Optimistic update is enough, but fetch ensures sync
    };

    const handleTaskSave = (task: Task) => {
        updateTaskState(task);
        setIsModalOpen(false);
        fetchTasks();
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('kanban.deleteConfirm'))) return;
        await authenticatedFetch(`/api/tasks/${id}`, { method: 'DELETE' });
        setTasks(prev => prev.filter(t => t._id !== id));
    };

    const openModal = (task?: Task) => {
        setCurrentTask(task || null);
        setIsModalOpen(true);
    };

    const moveTask = async (task: Task, newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
        if (task.status === newStatus) return;

        // Optimistic UI
        setTasks(prev => prev.map(t => t._id === task._id ? { ...t, status: newStatus } : t));

        await authenticatedFetch(`/api/tasks/${task._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        });
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const taskId = active.id as string;
            const newStatus = over.id as 'TODO' | 'IN_PROGRESS' | 'DONE';

            const task = tasks.find(t => t._id === taskId);
            if (task) {
                moveTask(task, newStatus);
            }
        }
        setActiveId(null);
    };

    const filterTasks = (status: string) => tasks.filter(t => t.status === status);
    const activeTask = activeId ? tasks.find(t => t._id === activeId) : null;

    return (
        <section className="content pb-3">
            <div className="container-fluid h-100 d-flex flex-column">
                <div className="row mb-3">
                    <div className="col-12">
                        {/* Mobile Tabs Navigation */}
                        <div className="d-block d-md-none mb-3">
                            <ul className="nav nav-pills">
                                <li className="nav-item">
                                    <a
                                        className={`nav-link ${activeTab === 'TODO' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('TODO')}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {t('kanban.todo')}
                                    </a>
                                </li>
                                <li className="nav-item">
                                    <a
                                        className={`nav-link ${activeTab === 'IN_PROGRESS' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('IN_PROGRESS')}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {t('kanban.inProgress')}
                                    </a>
                                </li>
                                <li className="nav-item">
                                    <a
                                        className={`nav-link ${activeTab === 'DONE' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('DONE')}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {t('kanban.done')}
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <div className="row flex-grow-1">
                        <div className={`col-12 col-md-4 ${activeTab === 'TODO' ? 'd-block' : 'd-none d-md-block'}`}>
                            <DroppableColumn id="TODO" title={t('kanban.todo')} className="card-primary">
                                {filterTasks('TODO').map(task => (
                                    <DraggableTaskCard
                                        key={task._id}
                                        task={task}
                                        onEdit={() => openModal(task)}
                                        onDelete={() => handleDelete(task._id)}
                                        onMove={(newStatus: any) => {
                                            moveTask(task, newStatus);
                                            setActiveTab(newStatus);
                                        }}
                                    />
                                ))}
                            </DroppableColumn>
                        </div>
                        <div className={`col-12 col-md-4 ${activeTab === 'IN_PROGRESS' ? 'd-block' : 'd-none d-md-block'}`}>
                            <DroppableColumn id="IN_PROGRESS" title={t('kanban.inProgress')} className="card-default" headerClass="bg-info">
                                {filterTasks('IN_PROGRESS').map(task => (
                                    <DraggableTaskCard
                                        key={task._id}
                                        task={task}
                                        onEdit={() => openModal(task)}
                                        onDelete={() => handleDelete(task._id)}
                                        onMove={(newStatus: any) => {
                                            moveTask(task, newStatus);
                                            setActiveTab(newStatus);
                                        }}
                                    />
                                ))}
                            </DroppableColumn>
                        </div>
                        <div className={`col-12 col-md-4 ${activeTab === 'DONE' ? 'd-block' : 'd-none d-md-block'}`}>
                            <DroppableColumn id="DONE" title={t('kanban.done')} className="card-success">
                                {filterTasks('DONE').map(task => (
                                    <DraggableTaskCard
                                        key={task._id}
                                        task={task}
                                        onEdit={() => openModal(task)}
                                        onDelete={() => handleDelete(task._id)}
                                        onMove={(newStatus: any) => {
                                            moveTask(task, newStatus);
                                            setActiveTab(newStatus);
                                        }}
                                    />
                                ))}
                            </DroppableColumn>
                        </div>
                    </div>

                    <DragOverlay>
                        {activeTask ? (
                            <div className="card card-light card-outline" style={{ cursor: 'grabbing', opacity: 0.9 }}>
                                <div className="card-header">
                                    <h5 className="card-title">{activeTask.title}</h5>
                                </div>
                                <div className="card-body">
                                    <p>{activeTask.description}</p>
                                    <small className="text-muted">
                                        <i className="far fa-clock mr-1"></i> {activeTask.recurrence}
                                        {activeTask.timeFrame?.start && ` • ${activeTask.timeFrame.start} - ${activeTask.timeFrame.end}`}
                                    </small>
                                </div>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>

            {/* Floating Action Button (FAB) */}
            {!isModalOpen && (
                <button
                    className="btn btn-primary rounded-circle elevation-3"
                    style={{
                        position: 'fixed',
                        bottom: '2rem',
                        right: '2rem',
                        width: '60px',
                        height: '60px',
                        fontSize: '24px',
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

            {
                isModalOpen && (
                    <TaskModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        task={currentTask}
                        onSave={handleTaskSave}
                        onUpdate={updateTaskState}
                    />
                )
            }
        </section >
    );
}

function DroppableColumn({ id, title, children, className, headerClass }: any) {
    const { setNodeRef } = useDroppable({ id });
    return (
        <div className={`card card-row ${className} h-100`}>
            <div className={`card-header ${headerClass || ''}`}>
                <h3 className="card-title">{title}</h3>
            </div>
            <div ref={setNodeRef} className="card-body" style={{ minHeight: '200px' }}>
                {children}
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
        opacity: isDragging ? 0 : 1,
        cursor: 'grab',
        touchAction: 'none',
    } as React.CSSProperties;

    // Helper to translate recurrence key safely
    const recurrenceLabel = task.recurrence
        ? t(`kanban.${task.recurrence.toLowerCase()}` as any) || task.recurrence
        : '';

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={onEdit}
        >
            <div className="card card-light card-outline">
                <div className="card-header">
                    <h5 className="card-title">{task.title}</h5>
                    <div className="card-tools">
                        {/* Move Dropdown (Mobile Friendly) */}
                        <div className="btn-group">
                            <button type="button" className="btn btn-tool dropdown-toggle" data-toggle="dropdown" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); }}>
                                <i className="fas fa-exchange-alt"></i>
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
                            </div>
                        </div>
                        <button className="btn btn-tool" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                            <i className="fas fa-pen"></i>
                        </button>
                        <button className="btn btn-tool text-danger" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                            <i className="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div className="card-body">
                    <p>{task.description}</p>
                    <small className="text-muted">
                        <i className="far fa-clock mr-1"></i> {recurrenceLabel}
                        {task.timeFrame?.start && ` • ${task.timeFrame.start} - ${task.timeFrame.end}`}
                    </small>
                </div>
            </div>
        </div>
    );
}
