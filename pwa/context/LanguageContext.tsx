'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { en, Dictionary } from '../utils/dictionaries/en';
import { bg } from '../utils/dictionaries/bg';

type Language = 'en' | 'bg';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: keyof Dictionary) => string;
    isLoaded: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>('en'); // Default to EN initially
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Check localStorage on mount
        const storedLang = localStorage.getItem('language') as Language;
        if (storedLang && (storedLang === 'en' || storedLang === 'bg')) {
            setLanguageState(storedLang);
        }
        // If no stored lang, we keep 'en' (default) but isLoaded becomes true, 
        // prompting the modal if generic logic decides so (handled in UI components)
        setIsLoaded(true);
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('language', lang);
    };

    const t = (key: keyof Dictionary): string => {
        const dict = language === 'bg' ? bg : en;
        return dict[key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, isLoaded }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
