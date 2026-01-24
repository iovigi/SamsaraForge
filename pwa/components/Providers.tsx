'use client';

import { LanguageProvider } from '../context/LanguageContext';
import { ModalProvider } from '../context/ModalContext';

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <LanguageProvider>
            <ModalProvider>
                {children}
            </ModalProvider>
        </LanguageProvider>
    );
}
