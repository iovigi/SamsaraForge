'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface MessageModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onClose: () => void;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'success' | 'error' | 'info' | 'warning';
}

export default function MessageModal({
    isOpen,
    title,
    message,
    onClose,
    onConfirm,
    confirmText,
    cancelText,
    type = 'info'
}: MessageModalProps) {
    const { t } = useLanguage();

    if (!isOpen) return null;

    return (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }} tabIndex={-1} role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className={`modal-header ${type === 'error' ? 'bg-danger text-white' : type === 'success' ? 'bg-success text-white' : ''}`}>
                        <h5 className="modal-title">{title}</h5>
                        <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
                    </div>
                    <div className="modal-body">
                        <p>{message}</p>
                    </div>
                    <div className="modal-footer">
                        {onConfirm && (
                            <button type="button" className="btn btn-secondary" onClick={onClose}>
                                {cancelText || t('common.cancel')}
                            </button>
                        )}
                        <button
                            type="button"
                            className={`btn ${type === 'error' ? 'btn-danger' : type === 'success' ? 'btn-success' : 'btn-primary'}`}
                            onClick={() => {
                                if (onConfirm) onConfirm();
                                else onClose();
                            }}
                        >
                            {confirmText || t('common.ok')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
