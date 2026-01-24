'use client';

import { useState, useEffect } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { useLanguage } from '../context/LanguageContext';
import { useModal } from '../context/ModalContext';
import { uploadFile, authenticatedFetch } from '../utils/api';
import { API_BASE_URL } from '../utils/config';

interface ProjectTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    task?: any;
    projectId: string;
    onSave: (task: any) => void;
}

export default function ProjectTaskModal({ isOpen, onClose, task, projectId, onSave }: ProjectTaskModalProps) {
    const { t } = useLanguage();
    const { showModal } = useModal();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('TODO');
    const [estimatedTime, setEstimatedTime] = useState(0);
    const [estimatedTimeUnit, setEstimatedTimeUnit] = useState('hours');
    const [files, setFiles] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);

    // Discussion state
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState<any[]>([]);
    const [editingCommentIdx, setEditingCommentIdx] = useState<number | null>(null);
    const [editingCommentText, setEditingCommentText] = useState('');
    const [descUploading, setDescUploading] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description || '');
            setStatus(task.status);
            setEstimatedTime(task.estimatedTime || 0);
            setEstimatedTimeUnit(task.estimatedTimeUnit || 'hours');
            setFiles(task.files || []);
            setComments(task.comments || []);
        } else {
            setTitle('');
            setDescription('');
            setStatus('TODO');
            setEstimatedTime(0);
            setEstimatedTimeUnit('hours');
            setFiles([]);
            setComments([]);
        }
    }, [task, isOpen]);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await authenticatedFetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    setCurrentUser(data.user);
                }
            } catch (err) {
                console.error('Failed to fetch user', err);
            }
        };
        if (isOpen) {
            fetchUser();
        }
    }, [isOpen]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploading(true);
            try {
                const res = await uploadFile(e.target.files[0]);
                const newFile = {
                    name: res.originalName,
                    url: res.url,
                    type: res.type,
                    uploadedAt: new Date()
                };
                setFiles([...files, newFile]);
            } catch (err) {
                console.error('Upload failed', err);
                showModal({ title: t('projects.upload'), message: t('projects.uploadFailed'), type: 'error' });
            } finally {
                setUploading(false);
            }
        }
    };

    const handleDescriptionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setDescUploading(true);
            try {
                const res = await uploadFile(e.target.files[0]);
                const imageUrl = res.url.startsWith('http') ? res.url : `${API_BASE_URL}${res.url}`;
                // Append markdown image syntax
                const imageMarkdown = `\n![${res.originalName}](${imageUrl})\n`;
                setDescription(prev => prev + imageMarkdown);
            } catch (err) {
                console.error('Image upload failed', err);
                showModal({ title: t('projects.upload'), message: t('projects.imageUploadFailed'), type: 'error' });
            } finally {
                setDescUploading(false);
                // Clear input
                e.target.value = '';
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            _id: task?._id,
            projectId,
            title,
            description,
            status,
            estimatedTime,
            estimatedTimeUnit,
            files,
            comments
        });
    };

    const saveCommentsToBackend = async (updatedComments: any[]) => {
        // If task exists, save comments immediately
        if (task && task._id) {
            try {
                // Check if we assume last write wins.
                await authenticatedFetch(`/api/projects/${projectId}/tasks/${task._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ comments: updatedComments })
                });
                // We don't necessarily need to reload the whole task if we just assume it worked,
                // but reloading might be safer to get correct timestamps if server sets them.
                // For now, local update is enough for UI responsiveness.
            } catch (err) {
                console.error('Failed to save comments', err);
                showModal({ title: t('tasks.discussion'), message: t('tasks.saveCommentFailed'), type: 'error' });
            }
        }
    };

    const addComment = async () => {
        if (!commentText.trim()) return;

        const authorName = currentUser ? (currentUser.nickname || currentUser.email) : t('tasks.me');
        const authorId = currentUser?._id;

        const newComment = {
            text: commentText,
            authorName,
            authorId,
            createdAt: new Date().toISOString()
        };
        const updatedComments = [...comments, newComment];
        setComments(updatedComments);
        setCommentText('');

        await saveCommentsToBackend(updatedComments);
    };

    const deleteComment = async (idx: number) => {
        showModal({
            title: t('kanban.deleteComment'),
            message: t('tasks.confirmDeleteComment'),
            type: 'warning',
            confirmText: t('common.delete'),
            cancelText: t('common.cancel'),
            onConfirm: async () => {
                const updatedComments = comments.filter((_, i) => i !== idx);
                setComments(updatedComments);
                await saveCommentsToBackend(updatedComments);
            }
        });
    };

    const startEditComment = (idx: number, text: string) => {
        setEditingCommentIdx(idx);
        setEditingCommentText(text);
    };

    const saveEditComment = async () => {
        if (editingCommentIdx === null) return;
        const updatedComments = [...comments];
        updatedComments[editingCommentIdx].text = editingCommentText;
        setComments(updatedComments);
        setEditingCommentIdx(null);
        setEditingCommentText('');

        await saveCommentsToBackend(updatedComments);
    };

    const cancelEditComment = () => {
        setEditingCommentIdx(null);
        setEditingCommentText('');
    };

    const canModifyComment = (comment: any) => {
        // If we have currentUser, check ID matching
        // If comment has no authorId (legacy), maybe allow? Or restrict?
        // User wants: "only the comment's author".
        if (!currentUser) return false;
        if (!comment.authorId) return false; // Legacy comments can't be edited by check? Or maybe allow Admin?
        return comment.authorId === currentUser._id;
    };

    if (!isOpen) return null;

    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', overflowY: 'auto' }}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">{task ? t('tasks.edit') : t('tasks.new')}</h5>
                        <button type="button" className="close" onClick={onClose}>
                            <span>&times;</span>
                        </button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <ul className="nav nav-tabs mb-3 flex-nowrap" role="tablist" style={{ overflowX: 'auto', overflowY: 'hidden', whiteSpace: 'nowrap' }}>
                                <li className="nav-item">
                                    <a className="nav-link active" data-toggle="tab" href="#details" role="tab" onClick={e => e.preventDefault()}>{t('tasks.details')}</a>
                                </li>
                                <li className="nav-item">
                                    <a className="nav-link" data-toggle="tab" href="#files" role="tab" onClick={e => e.preventDefault()}>{t('tasks.files')} ({files.length})</a>
                                </li>
                                <li className="nav-item">
                                    <a className="nav-link" data-toggle="tab" href="#comments" role="tab" onClick={e => e.preventDefault()}>{t('tasks.discussion')} ({comments.length})</a>
                                </li>
                            </ul>

                            <div className="tab-content">
                                {/* Details Tab */}
                                <div className="tab-pane fade show active" id="details" role="tabpanel">
                                    <div className="form-group">
                                        <label>{t('tasks.title')}</label>
                                        <input type="text" className="form-control" value={title} onChange={e => setTitle(e.target.value)} required />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('tasks.description')}</label>
                                        <div className="mb-2" data-color-mode="light" style={{ maxWidth: '100%', overflow: 'hidden' }}>
                                            <MDEditor
                                                value={description}
                                                onChange={(val) => setDescription(val || '')}
                                                height={300}
                                                preview="edit"
                                                visibleDragbar={false}
                                                textareaProps={{
                                                    placeholder: t('tasks.description')
                                                }}
                                            />
                                        </div>
                                        <div className="d-flex flex-wrap align-items-center mt-2">
                                            <small className="form-text text-muted mr-3 mb-2 mb-md-0">{t('tasks.pasteImages')}</small>
                                            <div className="custom-file" style={{ width: 'auto' }}>
                                                <input type="file" className="custom-file-input" id="descImageUpload" style={{ display: 'none' }} onChange={handleDescriptionImageUpload} accept="image/*" />
                                                <label className="btn btn-sm btn-outline-primary mb-0" htmlFor="descImageUpload">
                                                    {descUploading ? t('projects.uploading') : t('tasks.insertImage')}
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group col-md-6">
                                            <label>{t('tasks.status')}</label>
                                            <select className="form-control" value={status} onChange={e => setStatus(e.target.value)}>
                                                <option value="TODO">{t('tasks.todo')}</option>
                                                <option value="IN_PROGRESS">{t('tasks.inProgress')}</option>
                                                <option value="DONE">{t('tasks.done')}</option>
                                            </select>
                                        </div>
                                        <div className="form-group col-md-6">
                                            <label>{t('tasks.estimatedTime')}</label>
                                            <div className="input-group">
                                                <input type="number" className="form-control" value={estimatedTime} onChange={e => setEstimatedTime(Number(e.target.value))} />
                                                <div className="input-group-append">
                                                    <select className="custom-select" value={estimatedTimeUnit} onChange={e => setEstimatedTimeUnit(e.target.value)}>
                                                        <option value="minutes">{t('common.minutes')}</option>
                                                        <option value="hours">{t('common.hours')}</option>
                                                        <option value="days">{t('common.days')}</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Files Tab */}
                                <div className="tab-pane fade" id="files" role="tabpanel">
                                    <div className="custom-file mb-3">
                                        <input type="file" className="custom-file-input" onChange={handleFileUpload} />
                                        <label className="custom-file-label" data-browse={t('common.browse')}>{t('tasks.chooseFile')}</label>
                                    </div>
                                    {uploading && <div className="progress mb-3"><div className="progress-bar progress-bar-striped progress-bar-animated w-100">{t('projects.uploading')}</div></div>}
                                    <div className="list-group">
                                        {files.map((file, idx) => (
                                            <div key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                                                <div>
                                                    <a href={file.url.startsWith('http') ? file.url : `${API_BASE_URL}${file.url}`} target="_blank" rel="noreferrer">{file.name}</a>
                                                    <br />
                                                    <small className="text-muted">{new Date(file.uploadedAt).toLocaleString()}</small>
                                                </div>
                                                <button type="button" className="btn btn-sm btn-danger" onClick={() => setFiles(files.filter((_, i) => i !== idx))}>
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Discussion Tab */}
                                <div className="tab-pane fade" id="comments" role="tabpanel">
                                    <div className="comments-list mb-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        {comments.map((c, idx) => (
                                            <div key={idx} className="card mb-2">
                                                <div className="card-body py-2">
                                                    <div className="d-flex justify-content-between align-items-start">
                                                        <h6 className="card-subtitle mb-2 text-muted" style={{ fontSize: '0.8rem' }}>
                                                            {t('tasks.commentBy' as any)
                                                                .replace('{{name}}', c.authorName)
                                                                .replace('{{date}}', new Date(c.createdAt).toLocaleString())}
                                                        </h6>
                                                        {canModifyComment(c) && (
                                                            <div>
                                                                <button type="button" className="btn btn-link btn-sm p-0 mr-2" onClick={() => startEditComment(idx, c.text)}>{t('common.edit')}</button>
                                                                <button type="button" className="btn btn-link btn-sm p-0 text-danger" onClick={() => deleteComment(idx)}>{t('common.delete')}</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {editingCommentIdx === idx ? (
                                                        <div className="mt-2">
                                                            <textarea className="form-control mb-2" value={editingCommentText} onChange={e => setEditingCommentText(e.target.value)} rows={2} />
                                                            <button type="button" className="btn btn-sm btn-primary mr-1" onClick={saveEditComment}>{t('common.save')}</button>
                                                            <button type="button" className="btn btn-sm btn-secondary" onClick={cancelEditComment}>{t('projects.cancel')}</button>
                                                        </div>
                                                    ) : (
                                                        <p className="card-text mb-0" style={{ whiteSpace: 'pre-wrap' }}>{c.text}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {comments.length === 0 && <p className="text-muted text-center pt-3">{t('tasks.noDiscussion')}</p>}
                                    </div>
                                    <div className="input-group">
                                        <input type="text" className="form-control" placeholder={t('tasks.writeComment')} value={commentText} onChange={e => setCommentText(e.target.value)} />
                                        <div className="input-group-append">
                                            <button className="btn btn-outline-secondary" type="button" onClick={addComment}>{t('tasks.post')}</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('projects.cancel')}</button>
                            <button type="submit" className="btn btn-primary">{t('tasks.save')}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
