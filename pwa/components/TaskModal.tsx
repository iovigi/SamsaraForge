'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useModal } from '../context/ModalContext';
import { authenticatedFetch } from '../utils/api';
import { ActivityCalendar } from 'react-activity-calendar';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: any | null;
    onSave: (task: any) => void;
    onUpdate?: (task: any) => void;
}

export default function TaskModal({ isOpen, onClose, task, onSave, onUpdate }: TaskModalProps) {
    const { t } = useLanguage();
    const { showModal } = useModal();
    const [title, setTitle] = useState('');

    const [description, setDescription] = useState('');
    const [intention, setIntention] = useState('');
    const [status, setStatus] = useState('TODO');

    const [notify, setNotify] = useState(true);
    const [recurrence, setRecurrence] = useState('ONCE');
    const [timeFrameStart, setTimeFrameStart] = useState('00:00');
    const [timeFrameEnd, setTimeFrameEnd] = useState('23:59');
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');

    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [editText, setEditText] = useState('');
    const [currentUserEmail, setCurrentUserEmail] = useState('');

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

    const [cronTab, setCronTab] = useState<'minutes' | 'hourly'>('minutes');
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Generate Cron string based on Builder State
    useEffect(() => {
        let newCron = reminderCron;
        if (cronType === 'MINUTES') {
            if (cronMinutesInterval > 1) newCron = `*/${cronMinutesInterval} * * * *`;
            else newCron = '* * * * *';
        } else if (cronType === 'HOURLY') {
            if (cronHourlyInterval > 1) {
                newCron = `${cronHourlyMinute} ${cronHourlyStart}/${cronHourlyInterval} * * *`;
            } else {
                if (cronHourlyStart > 0) {
                    newCron = `${cronHourlyMinute} ${cronHourlyStart}/${cronHourlyInterval} * * *`;
                } else {
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

    const isDarkMode = typeof document !== 'undefined' && document.body.classList.contains('dark-mode');
    const currentStreak = task?.streak || 0;
    const historyData = task?.completionDates?.map((date: string) => ({
        date: new Date(date).toISOString().split('T')[0],
        count: 1,
        level: 1
    })) || [];

    // Initialize State from Task
    useEffect(() => {
        if (task && isOpen) {
            setTitle(task.title);
            setDescription(task.description || '');
            setIntention(task.intention || '');
            setStatus(task.status || 'TODO');
            setNotify(task.notify !== undefined ? task.notify : true);
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
            } else {
                setReminderCron('* * * * *');
            }
        } else if (isOpen && !task) {
            // New Task
            setTitle('');
            setDescription('');
            setIntention('');
            setStatus('TODO');
            setNotify(true);
            setRecurrence('ONCE');
            setTimeFrameStart('00:00');
            setTimeFrameEnd('23:59');
            setComments([]);
            setReminderCron('* * * * *');
            setCronType('MINUTES');
            setEditIndex(null);
        }
    }, [task, isOpen]);

    const syncComments = async (updatedComments: any[]) => {
        try {
            const res = await authenticatedFetch(`/api/habits/${task._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comments: updatedComments })
            });

            if (res.ok) {
                const data = await res.json();
                setComments(data.habit.comments || []);
                if (onUpdate) onUpdate(data.habit);
                else onSave(data.habit);
                return true;
            }
        } catch (err) {
            console.error(err);
        }
        return false;
    };

    useEffect(() => {
        // Fetch User Info (Nickname or Email)
        const initUser = async () => {
            try {
                const res = await authenticatedFetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    setCurrentUser(data.user);
                    const label = data.user?.nickname || data.user?.email || 'User';
                    setCurrentUserEmail(label); // Keeping state name for minimal refactor, but it holds the display label
                }
            } catch (e) {
                console.error('Failed to fetch user info', e);
            }
        };
        initUser();
    }, []);

    const toggleWeekDay = (dayIdx: number) => {
        setWeekDays(prev =>
            prev.includes(dayIdx) ? prev.filter(d => d !== dayIdx) : [...prev, dayIdx]
        );
    };

    const canModifyComment = (comment: any) => {
        if (!currentUser) return false;
        return comment.authorEmail === currentUser.email || comment.authorEmail === currentUser.nickname;
    };

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
        showModal({
            title: t('kanban.deleteComment'),
            message: 'Are you sure you want to delete this comment?',
            type: 'warning',
            confirmText: t('common.delete'),
            cancelText: t('common.cancel'),
            onConfirm: async () => {
                const updatedComments = comments.filter((_, i) => i !== index);
                await syncComments(updatedComments);
                showModal({ title: t('kanban.deleteComment'), message: 'Comment deleted', type: 'success' });
            }
        });
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

    // Alias functions for UI
    const addComment = handleAddComment;
    const deleteComment = handleDeleteComment;
    const startEditComment = (idx: number, text: string) => startEdit(idx, text);
    const saveEditComment = () => editIndex !== null && handleSaveEdit(editIndex);
    const cancelEditComment = () => { setEditIndex(null); setEditText(''); };

    // Naming harmony aliases for UI
    const minuteInterval = cronMinutesInterval;
    const setMinuteInterval = setCronMinutesInterval;
    const startHour = cronHourlyStart;
    const setStartHour = setCronHourlyStart;
    const startMinute = 0; // Simplified
    const hourInterval = cronHourlyInterval;
    const setHourInterval = setCronHourlyInterval;
    const atMinute = cronHourlyMinute;
    const setAtMinute = setCronHourlyMinute;
    const cronExpression = reminderCron;
    const selectedWeekDays = weekDays;
    const selectedMonthDay = monthDay;
    const setSelectedMonthDay = setMonthDay;
    const startTime = timeFrameStart;
    const setStartTime = setTimeFrameStart;
    const endTime = timeFrameEnd;
    const setEndTime = setTimeFrameEnd;
    const enableNotifications = notify;
    const setEnableNotifications = setNotify;
    const commentText = newComment;
    const setCommentText = setNewComment;
    const editingCommentIdx = editIndex;
    const editingCommentText = editText;
    const setEditingCommentText = setEditText;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Ensure we send a 5-field Unix cron to the backend
        const cleanCron = reminderCron.split(' ').slice(0, 5).join(' ');

        const payload = {
            title,
            description,
            intention,
            status,
            notify,
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

        const method = task ? 'PUT' : 'POST';
        const url = task ? `/api/habits/${task._id}` : '/api/habits';

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
                onSave(data.habit);
            } else {
                const data = await res.json();
                showModal({ title: t('kanban.saveError'), message: data.message, type: 'error' });
            }
        } catch (err) {
            console.error(err);
            showModal({ title: t('kanban.saveError'), message: 'An unexpected error occurred', type: 'error' });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', overflowY: 'auto' }}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">{task ? t('kanban.editTask') : t('kanban.newTask')}</h5>
                        <button type="button" className="close" onClick={onClose}>
                            <span>&times;</span>
                        </button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            {/* Streak info */}
                            {task && currentStreak > 0 && (
                                <div className="alert alert-success">
                                    <i className="fas fa-fire mr-2"></i>
                                    {t('kanban.streakMessage', { count: currentStreak })}
                                </div>
                            )}

                            <div className="form-group">
                                <label>{t('kanban.title')}</label>
                                <input type="text" className="form-control" value={title} onChange={e => setTitle(e.target.value)} required />
                            </div>

                            <div className="form-group">
                                <label>{t('kanban.intention')}</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={intention}
                                    onChange={e => setIntention(e.target.value)}
                                    placeholder={t('kanban.intentionPlaceholder')}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group col-md-6">
                                    <label>{t('kanban.status')}</label>
                                    <select className="form-control" value={status} onChange={e => setStatus(e.target.value)}>
                                        <option value="TODO">{t('kanban.todo')}</option>
                                        <option value="IN_PROGRESS">{t('kanban.inProgress')}</option>
                                        <option value="DONE">{t('kanban.done')}</option>
                                    </select>
                                </div>
                                <div className="form-group col-md-6">
                                    <label>{t('kanban.recurrence')}</label>
                                    <select className="form-control" value={recurrence} onChange={e => setRecurrence(e.target.value)}>
                                        <option value="ONCE">{t('kanban.once')}</option>
                                        <option value="DAILY">{t('kanban.daily')}</option>
                                        <option value="WEEKLY">{t('kanban.weekly')}</option>
                                        <option value="MONTHLY">{t('kanban.monthly')}</option>
                                    </select>
                                </div>
                            </div>

                            {/* Cron Builder UI */}
                            {recurrence !== 'ONCE' && (
                                <div className="card mb-3">
                                    <div className="card-header">
                                        {t('kanban.reminder')}
                                    </div>
                                    <div className="card-body">
                                        <ul className="nav nav-tabs mb-3">
                                            <li className="nav-item">
                                                <a className={`nav-link ${cronTab === 'minutes' ? 'active' : ''}`} onClick={() => setCronTab('minutes')} href="#">
                                                    {t('kanban.frequency.minutes')}
                                                </a>
                                            </li>
                                            <li className="nav-item">
                                                <a className={`nav-link ${cronTab === 'hourly' ? 'active' : ''}`} onClick={() => setCronTab('hourly')} href="#">
                                                    {t('kanban.frequency.hourly')}
                                                </a>
                                            </li>
                                        </ul>

                                        {cronTab === 'minutes' && (
                                            <div>
                                                <div className="form-group">
                                                    <label>{t('kanban.cron.prefix.every')}
                                                        <input type="number" className="form-control d-inline-block mx-2" style={{ width: '80px' }} value={minuteInterval} onChange={e => setMinuteInterval(Number(e.target.value))} min={1} max={59} />
                                                        {minuteInterval === 1 ? t('kanban.cron.suffix.minute') : t('kanban.cron.suffix.minutes')}
                                                    </label>
                                                </div>
                                                <div className="form-group">
                                                    <label>{t('kanban.cron.startingAt')}
                                                        <input type="number" className="form-control d-inline-block mx-2" style={{ width: '80px' }} value={startHour} onChange={e => setStartHour(Number(e.target.value))} min={0} max={23} />
                                                        : {startMinute.toString().padStart(2, '0')}
                                                    </label>
                                                </div>
                                            </div>
                                        )}

                                        {cronTab === 'hourly' && (
                                            <div>
                                                <div className="form-group">
                                                    <label>{t('kanban.cron.prefix.every')}
                                                        <input type="number" className="form-control d-inline-block mx-2" style={{ width: '80px' }} value={hourInterval} onChange={e => setHourInterval(Number(e.target.value))} min={1} max={23} />
                                                        {hourInterval === 1 ? t('kanban.cron.suffix.hour') : t('kanban.cron.suffix.hours')}
                                                    </label>
                                                </div>
                                                <div className="form-group">
                                                    <label>{t('kanban.cron.atMinute')}
                                                        <input type="number" className="form-control d-inline-block mx-2" style={{ width: '80px' }} value={atMinute} onChange={e => setAtMinute(Number(e.target.value))} min={0} max={59} />
                                                    </label>
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-2 text-muted">
                                            <small>{t('kanban.generatedCron')}: <code>{cronExpression}</code></small>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {recurrence === 'ONCE' && (
                                <div className="form-group">
                                    <label>{t('kanban.scheduledDate')}</label>
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
                                    <label>{t('kanban.weekDays')}</label>
                                    <div className="d-flex flex-wrap">
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                                            <div key={day} className="form-check mr-3">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    checked={selectedWeekDays.includes(idx)}
                                                    onChange={() => toggleWeekDay(idx)}
                                                />
                                                <label className="form-check-label">{t(`kanban.days.${day.toLowerCase()}` as any)}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {recurrence === 'MONTHLY' && (
                                <div className="form-group">
                                    <label>{t('kanban.monthDay')}</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        min="1"
                                        max="31"
                                        value={selectedMonthDay}
                                        onChange={e => setSelectedMonthDay(Number(e.target.value))}
                                    />
                                </div>
                            )}

                            {recurrence !== 'ONCE' && (
                                <div className="form-row">
                                    <div className="form-group col-md-6">
                                        <label>{t('kanban.startTime')}</label>
                                        <input
                                            type="time"
                                            className="form-control"
                                            value={startTime}
                                            onChange={e => setStartTime(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group col-md-6">
                                        <label>{t('kanban.endTime')}</label>
                                        <input
                                            type="time"
                                            className="form-control"
                                            value={endTime}
                                            onChange={e => setEndTime(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="form-group form-check">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id="enableNotifications"
                                    checked={enableNotifications}
                                    onChange={(e) => setEnableNotifications(e.target.checked)}
                                />
                                <label className="form-check-label" htmlFor="enableNotifications">{t('kanban.enableNotifications')}</label>
                            </div>

                            {/* Habit Completion History Heatmap */}
                            {task && task._id && (
                                <div className="mt-4">
                                    <h5>{t('dashboard.habitHistory')}</h5>
                                    <div className="d-flex justify-content-center w-100">
                                        {historyData.length > 0 ? (
                                            <ActivityCalendar
                                                data={historyData}
                                                labels={{
                                                    legend: {
                                                        less: t('dashboard.heatmap.less'),
                                                        more: t('dashboard.heatmap.more')
                                                    },
                                                    months: [
                                                        t('common.months.short.jan'), t('common.months.short.feb'), t('common.months.short.mar'),
                                                        t('common.months.short.apr'), t('common.months.short.may'), t('common.months.short.jun'),
                                                        t('common.months.short.jul'), t('common.months.short.aug'), t('common.months.short.sep'),
                                                        t('common.months.short.oct'), t('common.months.short.nov'), t('common.months.short.dec')
                                                    ],
                                                    weekdays: [
                                                        t('kanban.days.sun'), t('kanban.days.mon'), t('kanban.days.tue'), t('kanban.days.wed'),
                                                        t('kanban.days.thu'), t('kanban.days.fri'), t('kanban.days.sat')
                                                    ],
                                                    totalCount: t('kanban.history.totalCount')
                                                }}
                                                colorScheme={isDarkMode ? 'dark' : 'light'}
                                                theme={{
                                                    light: ['#EBEDF0', '#9BE9A8', '#40C463', '#30A14E', '#216E39'],
                                                    dark: ['#161B22', '#0E4429', '#006D32', '#26A641', '#39D353'],
                                                }}
                                                maxLevel={4}
                                            />
                                        ) : (
                                            <div className="text-center text-muted p-4 w-100 border rounded" style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                                                <i className="fas fa-calendar-times mb-2 d-block fa-2x opacity-50"></i>
                                                {t('kanban.noHistory')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <hr />
                            <h5>{t('kanban.comments')}</h5>
                            <div className="comments-section mb-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                {comments.length === 0 && <p className="text-muted text-center">{t('kanban.noComments')}</p>}
                                {comments.map((c, idx) => (
                                    <div key={idx} className="card mb-2">
                                        <div className="card-body p-2">
                                            <div className="d-flex justify-content-between">
                                                <small className="text-muted">
                                                    <strong>{c.authorName}</strong> - {new Date(c.createdAt).toLocaleString()}
                                                </small>
                                                {canModifyComment(c) && (
                                                    <div>
                                                        <button type="button" className="btn btn-sm btn-link p-0 mr-2" onClick={() => startEditComment(idx, c.text)}>
                                                            <i className="fas fa-edit"></i>
                                                        </button>
                                                        <button type="button" className="btn btn-sm btn-link p-0 text-danger" onClick={() => deleteComment(idx)}>
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            {editingCommentIdx === idx ? (
                                                <div className="mt-2">
                                                    <textarea
                                                        className="form-control mb-2"
                                                        rows={2}
                                                        value={editingCommentText}
                                                        onChange={(e) => setEditingCommentText(e.target.value)}
                                                    />
                                                    <button type="button" className="btn btn-sm btn-primary mr-2" onClick={saveEditComment}>{t('common.save')}</button>
                                                    <button type="button" className="btn btn-sm btn-secondary" onClick={cancelEditComment}>{t('common.cancel')}</button>
                                                </div>
                                            ) : (
                                                <p className="mb-0">{c.text}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="input-group">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder={t('kanban.writeComment')}
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            addComment();
                                        }
                                    }}
                                />
                                <div className="input-group-append">
                                    <button type="button" className="btn btn-outline-secondary" onClick={addComment}>
                                        <i className="fas fa-paper-plane"></i>
                                    </button>
                                </div>
                            </div>
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
