import AuthForm from '@/components/AuthForm';

export default function RegisterPage() {
    return (
        <div className="register-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="register-box">
                <div className="register-logo">
                    <a href="/">
                        <img src="/assets/dist/img/logo.png" alt="Samsara Forge" style={{ height: 300 }} />
                    </a>
                </div>
                <AuthForm mode="register" />
            </div>
        </div>
    );
}
