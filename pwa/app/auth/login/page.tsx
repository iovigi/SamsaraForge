import AuthForm from '@/components/AuthForm';

export default function LoginPage() {
    return (
        <div className="login-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="login-box">
                <div className="login-logo">
                    <a href="/">
                        <img src="/assets/dist/img/logo.png" alt="Samsara Forge" style={{ height: 300 }} />
                    </a>
                </div>
                <AuthForm mode="login" />
            </div>
        </div>
    );
}
