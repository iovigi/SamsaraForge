import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface NoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (note: string) => void;
    title?: string;
}

export default function NoteModal({ isOpen, onClose, onSave, title }: NoteModalProps) {
    const { t } = useLanguage();
    const [note, setNote] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        onSave(note);
        setNote('');
        onClose();
    };

    return (
        <>
            <div className="modal-backdrop fade show"></div>
            <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1} role="dialog">
                <div className="modal-dialog modal-dialog-centered" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">{t('dashboard.addNote') || 'Add Note'} - {title}</h5>
                            <button type="button" className="close" onClick={onClose}>
                                <span>&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>{t('dashboard.noteContent') || 'Note'}</label>
                                <textarea
                                    className="form-control"
                                    rows={4}
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder={t('dashboard.notePlaceholder') || 'Enter your thoughts...'}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('common.cancel') || 'Cancel'}</button>
                            <button type="button" className="btn btn-primary" onClick={handleSubmit}>{t('common.save') || 'Save'}</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
