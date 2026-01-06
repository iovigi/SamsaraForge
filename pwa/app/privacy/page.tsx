'use client';

import { useLanguage } from '../../context/LanguageContext';

export default function PrivacyPage() {
    const { t } = useLanguage();

    return (
        <div className="content-wrapper" suppressHydrationWarning>
            <div className="content-header">
                <div className="container">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1 className="m-0">{t('privacy.title')}</h1>
                        </div>
                    </div>
                </div>
            </div>

            <div className="content">
                <div className="container">
                    <div className="card">
                        <div className="card-body">
                            <h5>{t('privacy.collection.title')}</h5>
                            <p>{t('privacy.collection.text')}</p>

                            <h5>{t('privacy.usage.title')}</h5>
                            <p>{t('privacy.usage.text')}</p>

                            <h5>{t('privacy.rights.title')}</h5>
                            <p>{t('privacy.rights.text')}</p>

                            <p className="mt-4 text-muted">{t('privacy.lastUpdated')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
