'use client';

import { useState, useEffect } from 'react';
import TaskModal from './TaskModal';

interface Task {
    _id: string;
    title: string;
    description: string;
    status: 'TODO' | 'IN_PROGRESS' | 'DONE';
    recurrence: string;
    duration: string;
    reminderCron: string;
}

import { useRouter } from 'next/navigation';
import { authenticatedFetch } from '../utils/api';
import { DndContext, useDraggable, useDroppable, DragEndEvent, DragStartEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

export default function KanbanBoard() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTask, setCurrentTask] = useState<Task | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null); // Track active drag item
    const router = useRouter();

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

    const handleTaskUpdate = async (task: Task) => {
        setTasks(prev => {
            const exists = prev.find(t => t._id === task._id);
            if (exists) {
                return prev.map(t => t._id === task._id ? task : t);
            }
            return [task, ...prev];
        });
        setIsModalOpen(false);
        fetchTasks();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
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
            <div className="container-fluid h-100">
                <div className="row mb-3">
                    <div className="col-12 text-right">
                        <button className="btn btn-primary mr-3 mb-3" onClick={() => openModal()}>
                            <i className="fas fa-plus mr-1"></i> Add Task
                        </button>
                    </div>
                </div>

                <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <div className="row">
                        <div className="col-md-4">
                            <DroppableColumn id="TODO" title="To Do" className="card-primary">
                                {filterTasks('TODO').map(task => (
                                    <DraggableTaskCard key={task._id} task={task} onEdit={() => openModal(task)} onDelete={() => handleDelete(task._id)} />
                                ))}
                            </DroppableColumn>
                        </div>
                        <div className="col-md-4">
                            <DroppableColumn id="IN_PROGRESS" title="In Progress" className="card-default" headerClass="bg-info">
                                {filterTasks('IN_PROGRESS').map(task => (
                                    <DraggableTaskCard key={task._id} task={task} onEdit={() => openModal(task)} onDelete={() => handleDelete(task._id)} />
                                ))}
                            </DroppableColumn>
                        </div>
                        <div className="col-md-4">
                            <DroppableColumn id="DONE" title="Done" className="card-success">
                                {filterTasks('DONE').map(task => (
                                    <DraggableTaskCard key={task._id} task={task} onEdit={() => openModal(task)} onDelete={() => handleDelete(task._id)} />
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
                                        {activeTask.duration && ` • ${activeTask.duration}`}
                                    </small>
                                </div>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>

            {isModalOpen && (
                <TaskModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    task={currentTask}
                    onSave={handleTaskUpdate}
                />
            )}
        </section>
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

function DraggableTaskCard({ task, onEdit, onDelete }: any) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task._id,
    });
    const style = {
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        opacity: isDragging ? 0 : 1, // Hide original when dragging (using Overlay) or use 0.5
        cursor: 'grab',
        touchAction: 'none',
    } as React.CSSProperties;

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            <div className="card card-light card-outline">
                <div className="card-header">
                    <h5 className="card-title">{task.title}</h5>
                    <div className="card-tools">
                        <button className="btn btn-tool" onPointerDown={(e) => e.stopPropagation()} onClick={onEdit}>
                            <i className="fas fa-pen"></i>
                        </button>
                        <button className="btn btn-tool text-danger" onPointerDown={(e) => e.stopPropagation()} onClick={onDelete}>
                            <i className="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div className="card-body">
                    <p>{task.description}</p>
                    <small className="text-muted">
                        <i className="far fa-clock mr-1"></i> {task.recurrence}
                        {task.duration && ` • ${task.duration}`}
                    </small>
                </div>
            </div>
        </div>
    );
}
