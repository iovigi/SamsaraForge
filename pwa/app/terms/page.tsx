'use client';

import { useLanguage } from '../../context/LanguageContext';

export default function TermsPage() {
    const { t } = useLanguage();

    return (
        <div className="content-wrapper" suppressHydrationWarning>
            <div className="content-header">
                <div className="container">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1 className="m-0">{t('terms.title')}</h1>
                        </div>
                    </div>
                </div>
            </div>

            <div className="content">
                <div className="container">
                    <div className="card">
                        <div className="card-body">
                            <h5>{t('terms.intro.title')}</h5>
                            <p>{t('terms.intro.text')}</p>

                            <h5>{t('terms.use.title')}</h5>
                            <p>{t('terms.use.text')}</p>

                            <h5>{t('terms.accounts.title')}</h5>
                            <p>{t('terms.accounts.text')}</p>

                            <p className="mt-4 text-muted">{t('terms.lastUpdated')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
