
export default function PrivacyPage() {
    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1 className="m-0">Privacy & GDPR Policy</h1>
                        </div>
                    </div>
                </div>
            </div>

            <div className="content">
                <div className="container">
                    <div className="card">
                        <div className="card-body">
                            <h5>1. Data Collection</h5>
                            <p>We collect only the email address you provide for authentication purposes.</p>

                            <h5>2. Data Usage</h5>
                            <p>Your data is used solely to provide you access to your personal account and progress tracking.</p>

                            <h5>3. Your Rights (GDPR)</h5>
                            <p>You have the right to access, rectify, or delete your personal data at any time. Contact us to exercise these rights.</p>

                            <p className="mt-4 text-muted">Last updated: January 2026</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
