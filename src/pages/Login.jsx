import React from 'react';
import { Shield } from 'lucide-react';
import LoginForm from '../components/auth/LoginForm';
import Card, { CardContent } from '../components/ui/Card';

const Login = () => {
    return (
        <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center p-6 relative">
            <div
                className="absolute inset-0 pointer-events-none opacity-5"
                style={{
                    backgroundImage: 'linear-gradient(to right, var(--text-muted) 1px, transparent 1px), linear-gradient(to bottom, var(--text-muted) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />

            <div className="w-full max-w-[360px] z-10 flex flex-col items-center">
                <div className="flex flex-col items-center mb-8">
                    <Shield className="text-[var(--text-primary)] mb-3" size={48} strokeWidth={1.5} />
                    <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-wide mb-1">ThreatNest</h1>
                    <p className="text-13px text-[var(--text-secondary)]">Security Operations Platform</p>
                </div>

                <Card className="w-full shadow-2xl border-[var(--border-default)]">
                    <CardContent className="p-6">
                        <LoginForm />
                    </CardContent>
                </Card>

                <div className="mt-6 text-center">
                    <a href="#" className="text-11px text-[var(--text-link)] hover:underline font-medium">
                        Forgot password?
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Login;
