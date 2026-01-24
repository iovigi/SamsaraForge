'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import MessageModal from '../components/MessageModal';

interface ModalOptions {
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
}

interface ModalContextType {
    showModal: (options: ModalOptions) => void;
    hideModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
    const [modalState, setModalState] = useState<ModalOptions & { isOpen: boolean }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    const showModal = (options: ModalOptions) => {
        setModalState({ ...options, isOpen: true });
    };

    const hideModal = () => {
        setModalState(prev => ({ ...prev, isOpen: false }));
    };

    return (
        <ModalContext.Provider value={{ showModal, hideModal }}>
            {children}
            <MessageModal
                isOpen={modalState.isOpen}
                title={modalState.title}
                message={modalState.message}
                type={modalState.type}
                onClose={hideModal}
                onConfirm={modalState.onConfirm}
                confirmText={modalState.confirmText}
                cancelText={modalState.cancelText}
            />
        </ModalContext.Provider>
    );
}

export function useModal() {
    const context = useContext(ModalContext);
    if (context === undefined) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
}
