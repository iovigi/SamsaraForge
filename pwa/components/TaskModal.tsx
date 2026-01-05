'use client';

import { useState, useEffect } from 'react';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: any | null;
    onSave: (task: any) => void;
}

import { authenticatedFetch } from '../utils/api';

export default function TaskModal({ isOpen, onClose, task, onSave }: TaskModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [recurrence, setRecurrence] = useState('ONCE');
    const [duration, setDuration] = useState('');
    // const router = useRouter(); // No longer needed with authenticatedFetch

    // Reminder State (Simplified Cron Builder)
    const [remindDay, setRemindDay] = useState('*'); // * = every day
    const [remindHour, setRemindHour] = useState('9');
    const [remindMinute, setRemindMinute] = useState('0');

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description || '');
            setRecurrence(task.recurrence || 'ONCE');
            setDuration(task.duration || '');
            // Parse simple cron if possible, else default
            if (task.reminderCron) {
                const parts = task.reminderCron.split(' ');
                if (parts.length >= 2) {
                    setRemindMinute(parts[0]);
                    setRemindHour(parts[1]);
                    // Simplified...
                }
            }
        } else {
            setTitle('');
            setDescription('');
            setRecurrence('ONCE');
            setDuration('');
            setRemindHour('9');
            setRemindMinute('0');
        }
    }, [task]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Construct Cron
        // Simple format: minute hour * * * (Daily at specific time)
        const cron = `${remindMinute} ${remindHour} * * *`;

        const payload = {
            title,
            description,
            recurrence,
            duration,
            reminderCron: cron,
        };

        const method = task ? 'PUT' : 'POST';
        const url = task ? `/api/tasks/${task._id}` : '/api/tasks';

        try {
            const res = await authenticatedFetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                onSave(data.task);
            } else {
                const data = await res.json();
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">{task ? 'Edit Task' : 'New Task'}</h4>
                        <button type="button" className="close" onClick={onClose}>
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Title</label>
                                <input type="text" className="form-control" value={title} onChange={e => setTitle(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea className="form-control" rows={3} value={description} onChange={e => setDescription(e.target.value)}></textarea>
                            </div>
                            <div className="row">
                                <div className="col-6">
                                    <div className="form-group">
                                        <label>Recurrence</label>
                                        <select className="form-control" value={recurrence} onChange={e => setRecurrence(e.target.value)}>
                                            <option value="ONCE">Once</option>
                                            <option value="DAILY">Daily</option>
                                            <option value="WEEKLY">Weekly</option>
                                            <option value="MONTHLY">Monthly</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="form-group">
                                        <label>Duration (e.g. 25m)</label>
                                        <input type="text" className="form-control" value={duration} onChange={e => setDuration(e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Reminder Time (Cron Generator)</label>
                                <div className="d-flex">
                                    <select className="form-control mr-2" value={remindHour} onChange={e => setRemindHour(e.target.value)}>
                                        {Array.from({ length: 24 }, (_, i) => i).map(h => (
                                            <option key={h} value={h}>{h < 10 ? `0${h}` : h}</option>
                                        ))}
                                    </select>
                                    <span className="align-self-center mr-2">:</span>
                                    <select className="form-control" value={remindMinute} onChange={e => setRemindMinute(e.target.value)}>
                                        {Array.from({ length: 60 }, (_, i) => i).map(m => (
                                            <option key={m} value={m}>{m < 10 ? `0${m}` : m}</option>
                                        ))}
                                    </select>
                                </div>
                                <small className="text-muted">Generates cron: {remindMinute} {remindHour} * * *</small>
                            </div>

                        </div>
                        <div className="modal-footer justify-content-between">
                            <button type="button" className="btn btn-default" onClick={onClose}>Close</button>
                            <button type="submit" className="btn btn-primary">Save changes</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
