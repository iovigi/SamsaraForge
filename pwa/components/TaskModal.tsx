'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: any | null;
    onSave: (task: any) => void;
    onUpdate?: (task: any) => void;
}

import { authenticatedFetch, parseJwt } from '../utils/api';
// import { Cron } from 'react-js-cron'; // Removed
// Ensure Ant design styles are present if not globally available, usually pwa uses bootstrap.
// We might need to import css file for antd components to look right.
// import 'antd/dist/reset.css'; // This is for v5.
// For now, let's assume it works or we see unstyled component.
// I will import it conditionally or check if I can.
// Let's just import the component.

export default function TaskModal({ isOpen, onClose, task, onSave, onUpdate }: TaskModalProps) {
    const { t } = useLanguage();
    const [title, setTitle] = useState('');

    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('TODO');
    const [recurrence, setRecurrence] = useState('ONCE');
    const [timeFrameStart, setTimeFrameStart] = useState('00:00');
    const [timeFrameEnd, setTimeFrameEnd] = useState('23:59');
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');

    // Edit State
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [editText, setEditText] = useState('');
    const [currentUserEmail, setCurrentUserEmail] = useState('');

    const [remindHour, setRemindHour] = useState('9');
    const [remindMinute, setRemindMinute] = useState('0');



    const [scheduledDate, setScheduledDate] = useState<string>(''); // YYYY-MM-DD
    const [weekDays, setWeekDays] = useState<number[]>([]);
    const [monthDay, setMonthDay] = useState<number>(1);

    // Cron Builder State
    const [reminderCron, setReminderCron] = useState('* * * * *');
    const [cronType, setCronType] = useState<'MINUTES' | 'HOURLY'>('MINUTES');
    const [cronMinutesInterval, setCronMinutesInterval] = useState(1);
    const [cronHourlyInterval, setCronHourlyInterval] = useState(1);
    const [cronHourlyMinute, setCronHourlyMinute] = useState(0);
    const [cronHourlyStart, setCronHourlyStart] = useState(0);

    // Generate Cron string based on Builder State
    useEffect(() => {
        let newCron = reminderCron;
        if (cronType === 'MINUTES') {
            if (cronMinutesInterval > 1) newCron = `*/${cronMinutesInterval} * * * *`;
            else newCron = '* * * * *';
        } else if (cronType === 'HOURLY') {
            // S/I or */I (implied start 0)
            if (cronHourlyInterval > 1) {
                // If start is 0, we can use */interval or 0/interval (same thing)
                // Let's use start/interval logic explicitly to be safe
                // m S/I * * *
                newCron = `${cronHourlyMinute} ${cronHourlyStart}/${cronHourlyInterval} * * *`;
            } else {
                // Interval 1
                // If start > 0? Standard cron doesn't support "Every hour starting at 5".
                // That effectively means "At hour 5, 6, 7..."
                // m 5-23 * * * ?
                // For now, let's assume if Interval is 1, we ignore Start (or it means start 0).
                // User asked "Every X hours starting at Y".
                // If Interval is 1, it is EVERY hour. Start doesn't matter unless it is range.
                // Let's keep existing logic for Interval 1: m * * * *
                // But wait, user might want "Starting at 5PM every hour"? -> 5-23/1.
                // Simpler: If start > 0, generate range?
                // Let's stick to simple "Start" is only valid if Interval > 1 for standard cron generators usually.
                // But `S/1` is valid in many parsers as "every 1 hour starting at S".
                // Let's generate `m S/1 * * *` if Start > 0 even if Interval is 1?
                // Actually m * * * * is standard for every hour.
                // Let's only apply Start logic if Interval > 1 OR Start > 0.
                if (cronHourlyStart > 0) {
                    newCron = `${cronHourlyMinute} ${cronHourlyStart}/${cronHourlyInterval} * * *`;
                } else {
                    // Start 0
                    if (cronHourlyInterval > 1) {
                        newCron = `${cronHourlyMinute} */${cronHourlyInterval} * * *`;
                    } else {
                        newCron = `${cronHourlyMinute} * * * *`;
                    }
                }
            }
        }

        if (newCron !== reminderCron) {
            setReminderCron(newCron);
        }
    }, [cronType, cronMinutesInterval, cronHourlyInterval, cronHourlyMinute, cronHourlyStart]);

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description || '');
            setStatus(task.status || 'TODO');
            setRecurrence(task.recurrence || 'ONCE');
            if (task.timeFrame) {
                setTimeFrameStart(task.timeFrame.start || '00:00');
                setTimeFrameEnd(task.timeFrame.end || '23:59');
            } else {
                setTimeFrameStart('00:00');
                setTimeFrameEnd('23:59');
            }

            // Scheduling
            if (task.scheduledDate) setScheduledDate(new Date(task.scheduledDate).toISOString().split('T')[0]);
            else setScheduledDate('');

            setWeekDays(task.weekDays || []);
            setMonthDay(task.monthDay || 1);

            setComments(task.comments || []);
            setEditIndex(null);

            // Parse Cron
            if (task.reminderCron) {
                const cron = task.reminderCron.trim();
                setReminderCron(cron);

                const minutesMatch = cron.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/);
                const everyMinuteMatch = cron === '* * * * *';
                // m */h * * *
                const hourlyIntervalMatch = cron.match(/^(\d+)\s+\*\/(\d+)\s+\*\s+\*\s+\*$/);
                // m S/h * * *
                const hourlyStartIntervalMatch = cron.match(/^(\d+)\s+(\d+)\/(\d+)\s+\*\s+\*\s+\*$/);
                // m * * * * (Every hour at m)
                const hourlyEveryMatch = cron.match(/^(\d+)\s+\*\s+\*\s+\*\s+\*$/);

                if (everyMinuteMatch) {
                    setCronType('MINUTES');
                    setCronMinutesInterval(1);
                } else if (minutesMatch) {
                    setCronType('MINUTES');
                    setCronMinutesInterval(parseInt(minutesMatch[1]));
                } else if (hourlyStartIntervalMatch) {
                    setCronType('HOURLY');
                    setCronHourlyMinute(parseInt(hourlyStartIntervalMatch[1]));
                    setCronHourlyStart(parseInt(hourlyStartIntervalMatch[2]));
                    setCronHourlyInterval(parseInt(hourlyStartIntervalMatch[3]));
                } else if (hourlyIntervalMatch) {
                    setCronType('HOURLY');
                    setCronHourlyMinute(parseInt(hourlyIntervalMatch[1]));
                    setCronHourlyStart(0);
                    setCronHourlyInterval(parseInt(hourlyIntervalMatch[2]));
                } else if (hourlyEveryMatch) {
                    setCronType('HOURLY');
                    setCronHourlyMinute(parseInt(hourlyEveryMatch[1]));
                    setCronHourlyInterval(1);
                    setCronHourlyStart(0);
                } else {
                    // Default to Minutes 1 if unknown pattern
                    setCronType('MINUTES');
                    setCronMinutesInterval(1);
                }
            } else {
                setReminderCron('* * * * *');
                setCronType('MINUTES');
                setCronMinutesInterval(1);
            }
        } else {
            setTitle('');
            setDescription('');
            setStatus('TODO');
            setRecurrence('ONCE');
            setTimeFrameStart('00:00');
            setTimeFrameEnd('23:59');
            setComments([]);
            setReminderCron('* * * * *');
            setCronType('MINUTES');
            setCronMinutesInterval(1);
            setCronHourlyInterval(1);
            setCronHourlyMinute(0);
            setCronHourlyStart(0);
            setEditIndex(null);
        }
    }, [task]);

    const syncComments = async (updatedComments: any[]) => {
        try {
            const res = await authenticatedFetch(`/api/tasks/${task._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comments: updatedComments })
            });

            if (res.ok) {
                const data = await res.json();
                setComments(data.task.comments || []);
                if (onUpdate) onUpdate(data.task);
                else onSave(data.task);
                return true;
            }
        } catch (err) {
            console.error(err);
        }
        return false;
    };

    useEffect(() => {
        // Fetch User Email if missing
        const initEmail = async () => {
            const stored = localStorage.getItem('userEmail');
            if (stored && stored !== 'User') {
                setCurrentUserEmail(stored);
            } else {
                try {
                    const res = await authenticatedFetch('/api/auth/me');
                    if (res.ok) {
                        const data = await res.json();
                        if (data.user?.email) {
                            setCurrentUserEmail(data.user.email);
                            localStorage.setItem('userEmail', data.user.email);
                        }
                    }
                } catch (e) {
                    console.error('Failed to fetch user info', e);
                }
            }
        };
        initEmail();
    }, []);

    const handleAddComment = async () => {
        if (!newComment.trim() || !task) return;

        // Use state or fallback
        const email = currentUserEmail || 'User';

        const updatedComments = [...comments, { text: newComment, authorEmail: email, createdAt: new Date() }];

        if (await syncComments(updatedComments)) {
            setNewComment('');
        }
    };

    const handleDeleteComment = async (index: number) => {
        if (!confirm('Are you sure you want to delete this comment?')) return;
        const updatedComments = comments.filter((_, i) => i !== index);
        await syncComments(updatedComments);
    };

    const startEdit = (index: number, text: string) => {
        setEditIndex(index);
        setEditText(text);
    };

    const handleSaveEdit = async (index: number) => {
        if (!editText.trim()) return;
        const updatedComments = [...comments];
        updatedComments[index] = { ...updatedComments[index], text: editText };

        if (await syncComments(updatedComments)) {
            setEditIndex(null);
            setEditText('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Ensure we send a 5-field Unix cron to the backend
        const cleanCron = reminderCron.split(' ').slice(0, 5).join(' ');

        const payload = {
            title,
            description,
            status,
            recurrence,
            timeFrame: {
                start: timeFrameStart,
                end: timeFrameEnd
            },
            reminderCron: cleanCron,
            scheduledDate: recurrence === 'ONCE' ? scheduledDate : null,
            weekDays: recurrence === 'WEEKLY' ? weekDays : [],
            monthDay: recurrence === 'MONTHLY' ? monthDay : null,
        };

        // ... (rest of handleSubmit) ...
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
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">{task ? t('kanban.editTask') : t('kanban.newTask')}</h4>
                        <button type="button" className="close" onClick={onClose}>
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            {/* ... (previous inputs) ... */}
                            <div className="form-group">
                                <label>{t('kanban.title')}</label>
                                <input type="text" className="form-control" value={title} onChange={e => setTitle(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>{t('kanban.description')}</label>
                                <textarea className="form-control" rows={3} value={description} onChange={e => setDescription(e.target.value)}></textarea>
                            </div>

                            <div className="form-group">
                                <label>{t('kanban.status')}</label>
                                <select className="form-control" value={status} onChange={e => setStatus(e.target.value)}>
                                    <option value="TODO">{t('kanban.todo')}</option>
                                    <option value="IN_PROGRESS">{t('kanban.inProgress')}</option>
                                    <option value="DONE">{t('kanban.done')}</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>{t('kanban.recurrence')}</label>
                                <select className="form-control" value={recurrence} onChange={e => setRecurrence(e.target.value)}>
                                    <option value="ONCE">{t('kanban.once')}</option>
                                    <option value="DAILY">{t('kanban.daily')}</option>
                                    <option value="WEEKLY">{t('kanban.weekly')}</option>
                                    <option value="MONTHLY">{t('kanban.monthly')}</option>
                                </select>
                            </div>

                            {recurrence === 'ONCE' && (
                                <div className="form-group">
                                    <label>{t('kanban.scheduledDate') || 'Date'}</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={scheduledDate}
                                        onChange={e => setScheduledDate(e.target.value)}
                                        required
                                    />
                                </div>
                            )}

                            {recurrence === 'WEEKLY' && (
                                <div className="form-group">
                                    <label>{t('kanban.weekDays') || 'Week Days'}</label>
                                    <div className="d-flex flex-wrap">
                                        {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((dayKey, idx) => (
                                            <div key={dayKey} className="form-check mr-3">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    checked={weekDays.includes(idx)}
                                                    onChange={e => {
                                                        if (e.target.checked) setWeekDays([...weekDays, idx]);
                                                        else setWeekDays(weekDays.filter(d => d !== idx));
                                                    }}
                                                />
                                                <label className="form-check-label">
                                                    {t(`kanban.days.${dayKey}`) || dayKey.charAt(0).toUpperCase() + dayKey.slice(1)}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {recurrence === 'MONTHLY' && (
                                <div className="form-group">
                                    <label>{t('kanban.monthDay') || 'Day of Month'}</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        className="form-control"
                                        value={monthDay}
                                        onChange={e => setMonthDay(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label>{t('kanban.startTime') || 'Start Time'}</label>
                                <input
                                    type="time"
                                    className="form-control"
                                    value={timeFrameStart}
                                    onChange={e => setTimeFrameStart(e.target.value)}
                                    onClick={(e) => e.currentTarget.showPicker()}
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('kanban.endTime') || 'End Time'}</label>
                                <input
                                    type="time"
                                    className="form-control"
                                    value={timeFrameEnd}
                                    onChange={e => setTimeFrameEnd(e.target.value)}
                                    onClick={(e) => e.currentTarget.showPicker()}
                                />
                            </div>

                            <div className="form-group">
                                <label>{t('kanban.reminder')}</label>
                                <div className="cron-wrapper">
                                    <ul className="nav nav-tabs mb-3">
                                        <li className="nav-item">
                                            <a
                                                className={`nav-link ${cronType === 'MINUTES' ? 'active' : ''}`}
                                                href="#"
                                                onClick={(e) => { e.preventDefault(); setCronType('MINUTES'); }}
                                            >
                                                {t('kanban.frequency.minutes') || 'Minutes'}
                                            </a>
                                        </li>
                                        <li className="nav-item">
                                            <a
                                                className={`nav-link ${cronType === 'HOURLY' ? 'active' : ''}`}
                                                href="#"
                                                onClick={(e) => { e.preventDefault(); setCronType('HOURLY'); }}
                                            >
                                                {t('kanban.frequency.hourly') || 'Hourly'}
                                            </a>
                                        </li>
                                    </ul>

                                    <div className="tab-content mb-3">
                                        {cronType === 'MINUTES' && (
                                            <div className="tab-pane active">
                                                <div className="form-inline">
                                                    <label className="mr-2">{t('kanban.cron.prefix.every') || 'Every'}</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="59"
                                                        className="form-control form-control-sm mr-2"
                                                        style={{ width: '70px' }}
                                                        value={cronMinutesInterval}
                                                        onChange={(e) => setCronMinutesInterval(Math.max(1, parseInt(e.target.value) || 1))}
                                                    />
                                                    <label>{cronMinutesInterval === 1 ? (t('kanban.cron.suffix.minute') || 'minute') : (t('kanban.cron.suffix.minutes') || 'minutes')}</label>
                                                </div>
                                            </div>
                                        )}

                                        {cronType === 'HOURLY' && (
                                            <div className="tab-pane active">
                                                <div className="d-flex flex-column">
                                                    <div className="d-flex align-items-center mb-2">
                                                        <label className="mr-2" style={{ minWidth: '120px' }}>{t('kanban.cron.prefix.every') || 'Every'}</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="23"
                                                            className="form-control form-control-sm mr-2"
                                                            style={{ width: '70px' }}
                                                            value={cronHourlyInterval}
                                                            onChange={(e) => setCronHourlyInterval(Math.max(1, parseInt(e.target.value) || 1))}
                                                        />
                                                        <label>{cronHourlyInterval === 1 ? (t('kanban.cron.suffix.hour') || 'hour') : (t('kanban.cron.suffix.hours') || 'hours')}</label>
                                                    </div>

                                                    <div className="d-flex align-items-center mb-2">
                                                        <label className="mr-2" style={{ minWidth: '120px' }}>{t('kanban.cron.startingAt') || 'Starting at hour'}</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="23"
                                                            className="form-control form-control-sm mr-2"
                                                            style={{ width: '70px' }}
                                                            value={cronHourlyStart}
                                                            onChange={(e) => setCronHourlyStart(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
                                                        />
                                                    </div>

                                                    <div className="d-flex align-items-center">
                                                        <label className="mr-2" style={{ minWidth: '120px' }}>{t('kanban.cron.atMinute') || 'At minute'}</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="59"
                                                            className="form-control form-control-sm mr-2"
                                                            style={{ width: '70px' }}
                                                            value={cronHourlyMinute}
                                                            onChange={(e) => setCronHourlyMinute(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <label className="text-muted small">{t('kanban.generatedCron') || 'Generated Cron'}:</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        value={reminderCron}
                                        onChange={e => setReminderCron(e.target.value)}
                                        placeholder="* * * * *"
                                    />
                                </div>
                            </div>

                            {task && (
                                <>
                                    <hr />
                                    <h5>{t('kanban.comments')}</h5>
                                    <div className="card-footer card-comments mb-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        {comments.length === 0 && <p className="text-muted">{t('kanban.noComments')}</p>}
                                        {comments.map((comment: any, idx: number) => (
                                            <div className="card-comment" key={idx}>
                                                <div className="comment-text" style={{ marginLeft: 0 }}>
                                                    <span className="username">
                                                        {comment.authorEmail || 'User'}
                                                        <span className="text-muted float-right">
                                                            {new Date(comment.createdAt).toLocaleString()}
                                                            <button type="button" className="btn btn-tool ml-2" onClick={() => startEdit(idx, comment.text)}>
                                                                <i className="fas fa-pen"></i>
                                                            </button>
                                                            <button type="button" className="btn btn-tool text-danger" onClick={() => handleDeleteComment(idx)}>
                                                                <i className="fas fa-times"></i>
                                                            </button>
                                                        </span>
                                                    </span>
                                                    {editIndex === idx ? (
                                                        <div className="input-group input-group-sm mt-1">
                                                            <input
                                                                type="text"
                                                                className="form-control"
                                                                value={editText}
                                                                onChange={e => setEditText(e.target.value)}
                                                            />
                                                            <span className="input-group-append">
                                                                <button type="button" className="btn btn-info btn-flat" onClick={() => handleSaveEdit(idx)}>Save</button>
                                                                <button type="button" className="btn btn-default btn-flat" onClick={() => setEditIndex(null)}>Cancel</button>
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        comment.text
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="img-push">
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            placeholder={t('kanban.writeComment')}
                                            value={newComment}
                                            onChange={e => setNewComment(e.target.value)}
                                            onKeyDown={async (e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    await handleAddComment();
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-default mt-2"
                                            onClick={handleAddComment}
                                            disabled={!newComment.trim()}
                                        >
                                            {t('kanban.addComment')}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="modal-footer justify-content-between">
                            <button type="button" className="btn btn-default" onClick={onClose}>{t('common.close')}</button>
                            <button type="submit" className="btn btn-primary">{t('kanban.save')}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
