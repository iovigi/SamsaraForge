'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function LanguageModal() {
  const { setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if language has been selected previously
    const storedLang = localStorage.getItem('language');
    if (!storedLang) {
      setIsOpen(true);
    }
  }, []);

  const handleSelect = (lang: 'en' | 'bg') => {
    setLanguage(lang);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="language-modal-backdrop">
      <div className="language-modal-content">
        <h2 className="mb-4 text-center">Select Language / Изберете език</h2>
        <div className="d-flex justify-content-center gap-4">
          <button
            onClick={() => handleSelect('en')}
            className="btn btn-lg btn-outline-primary flag-btn"
          >
            <div className="flag-icon">
              <img src="/assets/flags/gb.svg" alt="English" />
            </div>
            <span>English</span>
          </button>
          <button
            onClick={() => handleSelect('bg')}
            className="btn btn-lg btn-outline-primary flag-btn"
          >
            <div className="flag-icon">
              <img src="/assets/flags/bg.svg" alt="Български" />
            </div>
            <span>Български</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        .language-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(8px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .language-modal-content {
          background: rgba(255, 255, 255, 0.95);
          padding: 3rem;
          border-radius: 1rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          max-width: 90%;
          width: 500px;
        }
        .flag-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1.5rem;
          gap: 1rem;
          width: 160px;
          transition: all 0.2s;
        }
        .flag-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .flag-icon img {
          width: 64px;
          height: auto;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
}
