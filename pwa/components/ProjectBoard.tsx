'use client';

import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../utils/api';
import { DndContext, useDraggable, useDroppable, DragEndEvent, DragStartEvent, DragOverlay, useSensor, useSensors, PointerSensor, TouchSensor, closestCorners } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ProjectTaskModal from './ProjectTaskModal';
import { SortableTaskWrapper } from './SortableTaskWrapper';

interface Task {
    _id: string;
    projectId: string;
    title: string;
    description: string;
    status: 'TODO' | 'IN_PROGRESS' | 'DONE';
    estimatedTime: number;
    estimatedTimeUnit: string;
    files: any[];
    comments: any[];
}

import { useLanguage } from '../context/LanguageContext';

export default function ProjectBoard({ project, onEditProject }: { project: any, onEditProject: () => void }) {
    const { t } = useLanguage();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTask, setCurrentTask] = useState<Task | null>(null);

    const projectId = project._id;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    const fetchTasks = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const res = await authenticatedFetch(`/api/projects/${projectId}/tasks`);
            if (res.ok) {
                const data = await res.json();
                // Ensure they are sorted by order initially
                const sorted = data.tasks.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

                // Compare if changed? For now just set.
                // Note: updating tasks while dragging might cancel drag.
                // We should only update if not activeId?
                // Or let React reconcile.
                setTasks(prev => {
                    // Simple optimization: if dragging, maybe pause updates or only update if fundamental change?
                    // But requirement says "if other user change something to the task to come to all users".
                    // If we blindly replace 'tasks', we might lose local state if DnD relies on it.
                    // But DnD uses 'activeId' which is separate. 
                    // However, if we replace the object references, it might cause re-render.
                    // Let's just update.
                    return sorted;
                });
            }
        } catch (error) {
            console.error('Error fetching project tasks:', error);
        } finally {
            if (!isSilent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();

        // PLLING: Fetch every 2 seconds
        const intervalId = setInterval(() => {
            // Only fetch if not dragging (to avoid disrupting DnD)
            // But how to access current activeId state in interval closure?
            // Use functional state update or ref?
            // Actually 'activeId' is in closure scope if we don't depend on it?
            // useEffect dependency [projectId, activeId] -> resets interval on drag start/end.
            if (!activeId) {
                fetchTasks(true);
            }
        }, 2000);

        return () => clearInterval(intervalId);
    }, [projectId, activeId]); // Re-create interval when activeId changes (drag starts/ends)

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        // ... (keep existing implementation) ...
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        const activeTask = tasks.find(t => t._id === activeId);
        const overTask = tasks.find(t => t._id === overId);

        if (!activeTask) return;

        let newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE' | null = null;

        if (['TODO', 'IN_PROGRESS', 'DONE'].includes(overId)) {
            newStatus = overId as any;
        } else if (overTask && overTask.status !== activeTask.status) {
            newStatus = overTask.status;
        }

        if (newStatus && newStatus !== activeTask.status) {
            const updatedTasks = tasks.map(t =>
                t._id === activeId ? { ...t, status: newStatus } : t
            ) as Task[];

            setTasks(updatedTasks);
            await authenticatedFetch(`/api/projects/${projectId}/tasks/${activeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
        } else if (activeId !== overId) {
            const oldIndex = tasks.findIndex(t => t._id === activeId);
            const newIndex = tasks.findIndex(t => t._id === overId);

            const newTasks = arrayMove(tasks, oldIndex, newIndex);
            setTasks(newTasks);

            const reorderedPayload = newTasks.map((t, idx) => ({
                _id: t._id,
                status: t.status,
                order: idx
            }));

            authenticatedFetch(`/api/projects/${projectId}/tasks/reorder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tasks: reorderedPayload })
            }).catch(e => console.error(e));
        }

        setActiveId(null);
    };

    const openModal = (task?: Task) => {
        setCurrentTask(task || null);
        setIsModalOpen(true);
    };

    const handleSaveTask = async (task: any) => {
        // ... (keep existing implementation) ...
        try {
            let res;
            if (task._id) {
                res = await authenticatedFetch(`/api/projects/${projectId}/tasks/${task._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(task)
                });
            } else {
                res = await authenticatedFetch(`/api/projects/${projectId}/tasks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(task)
                });
            }

            if (res.ok) {
                setIsModalOpen(false);
                fetchTasks();
            } else {
                const errData = await res.json();
                console.error('Task save failed:', errData);
                alert(`Error saving task: ${errData.message || 'Unknown error'}`);
            }
        } catch (error: any) {
            console.error('Task save exception:', error);
            alert(`Error saving task: ${error.message}`);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm(t('projects.deleteTaskConfirm'))) return;
        try {
            const res = await authenticatedFetch(`/api/projects/${projectId}/tasks/${taskId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setTasks(prev => prev.filter(t => t._id !== taskId));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const filterTasks = (status: string) => tasks.filter(t => t.status === status);
    const activeTask = activeId ? tasks.find(t => t._id === activeId) : null;

    if (loading && tasks.length === 0) return <div className="p-4 text-center">{t('projects.loading')}</div>;

    return (
        <div className="project-board h-100 p-3">
            {/* Header / Actions */}
            <div className="mb-3 d-flex justify-content-between align-items-center bg-white p-2 rounded shadow-sm" style={{ opacity: 0.9 }}>
                <h5 className="m-0 pl-2 font-weight-bold d-none d-md-block">{project.name}</h5>
                <div className="d-flex ml-auto">
                    <button className="btn btn-outline-secondary mr-2" onClick={onEditProject}>
                        <i className="fas fa-edit mr-2"></i> {t('projects.edit')}
                    </button>
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <i className="fas fa-plus mr-2"></i> {t('tasks.add')}
                    </button>
                </div>
            </div>

            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="d-flex flex-nowrap h-100 overflow-auto pb-3" style={{ gap: '1rem' }}>
                    <DroppableColumn id="TODO" title={t('tasks.todo')} icon="fas fa-list-ul" color="#6366f1">
                        <SortableContext items={filterTasks('TODO').map(t => t._id)} strategy={verticalListSortingStrategy}>
                            {filterTasks('TODO').map(task => (
                                <SortableTaskWrapper key={task._id} id={task._id}>
                                    <DraggableProjectTask task={task} onClick={() => openModal(task)} onDelete={() => handleDeleteTask(task._id)} t={t} />
                                </SortableTaskWrapper>
                            ))}
                        </SortableContext>
                    </DroppableColumn>
                    <DroppableColumn id="IN_PROGRESS" title={t('tasks.inProgress')} icon="fas fa-spinner" color="#ec4899">
                        <SortableContext items={filterTasks('IN_PROGRESS').map(t => t._id)} strategy={verticalListSortingStrategy}>
                            {filterTasks('IN_PROGRESS').map(task => (
                                <SortableTaskWrapper key={task._id} id={task._id}>
                                    <DraggableProjectTask task={task} onClick={() => openModal(task)} onDelete={() => handleDeleteTask(task._id)} t={t} />
                                </SortableTaskWrapper>
                            ))}
                        </SortableContext>
                    </DroppableColumn>
                    <DroppableColumn id="DONE" title={t('tasks.done')} icon="fas fa-check-circle" color="#22c55e">
                        <SortableContext items={filterTasks('DONE').map(t => t._id)} strategy={verticalListSortingStrategy}>
                            {filterTasks('DONE').map(task => (
                                <SortableTaskWrapper key={task._id} id={task._id}>
                                    <DraggableProjectTask task={task} onClick={() => openModal(task)} onDelete={() => handleDeleteTask(task._id)} t={t} />
                                </SortableTaskWrapper>
                            ))}
                        </SortableContext>
                    </DroppableColumn>
                </div>

                <DragOverlay>
                    {activeTask ? (
                        <div className="card shadow mb-3" style={{ cursor: 'grabbing', opacity: 0.8 }}>
                            <div className="card-body p-3">
                                <h6>{activeTask.title}</h6>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>

            </DndContext>

            {isModalOpen && (
                <ProjectTaskModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    task={currentTask}
                    projectId={projectId}
                    onSave={handleSaveTask}
                />
            )}
        </div>
    );
}

function DroppableColumn({ id, title, children, icon, color }: any) {
    const { setNodeRef } = useDroppable({ id });
    return (
        <div className="h-100" style={{ minWidth: '300px', flex: '0 0 85vw', maxWidth: '400px' }}>
            <div className="card h-100 bg-light border-0">
                <div className="card-header bg-transparent border-0 d-flex align-items-center">
                    <i className={`${icon} mr-2`} style={{ color }}></i>
                    <h6 className="mb-0 font-weight-bold">{title}</h6>
                    <span className="badge badge-pill badge-secondary ml-auto">{children.length}</span>
                </div>
                <div ref={setNodeRef} className="card-body p-2 flex-grow-1 overflow-auto" style={{ minHeight: '200px' }}>
                    {children}
                </div>
            </div>
        </div>
    );
}

function DraggableProjectTask({ task, onClick, onDelete, t }: any) {
    // Custom double tap logic for touch devices
    let lastTap = 0;
    const handleTouchEnd = (e: any) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 300 && tapLength > 0) {
            e.preventDefault();
            onClick();
        }
        lastTap = currentTime;
    };

    return (
        <div
            className="card shadow-sm mb-2 task-card"
            onDoubleClick={onClick}
            onTouchEnd={handleTouchEnd} // User asked for double click to edit, but single click is standard. Let's do double click as requested.
        // Actually, adding an edit button is better for accessibility. I'll add a small edit icon.
        >
            <div className="card-body p-3">
                <div className="d-flex justify-content-between">
                    <h6 className="card-title mb-1">{task.title}</h6>
                    <div className="task-actions">
                        <i className="fas fa-pencil-alt text-muted mr-2" style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); onClick(); }}></i>
                        <i className="fas fa-trash text-danger" style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); onDelete(); }}></i>
                    </div>
                </div>

                <p className="card-text small text-muted text-truncate mb-2">{task.description}</p>
                <div className="d-flex justify-content-between align-items-center small text-muted">
                    {task.estimatedTime > 0 && <span><i className="far fa-clock"></i> {task.estimatedTime} {t(`common.${task.estimatedTimeUnit}` as any)}</span>}
                    {task.files && task.files.length > 0 && <span><i className="fas fa-paperclip"></i> {task.files.length}</span>}
                    {task.comments && task.comments.length > 0 && <span><i className="far fa-comment"></i> {task.comments.length}</span>}
                </div>
            </div>
        </div>
    );
}
