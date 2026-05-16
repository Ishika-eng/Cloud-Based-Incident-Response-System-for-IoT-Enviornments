import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';
import Button from '../ui/Button';
import { Eye, EyeOff } from 'lucide-react';

const LoginForm = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const from = location.state?.from?.pathname || ROUTES.DASHBOARD;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(email, password);
            navigate(from, { replace: true });
        } catch (err) {
            setError('Invalid email or password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
                <label className="block text-11px font-medium text-[var(--text-secondary)] uppercase mb-1.5" htmlFor="email">
                    Email Address
                </label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-8 px-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[6px] text-13px text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)] transition-colors"
                    required
                    placeholder="admin@sentineliq.io"
                />
            </div>

            <div>
                <label className="block text-11px font-medium text-[var(--text-secondary)] uppercase mb-1.5" htmlFor="password">
                    Password
                </label>
                <div className="relative">
                    <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-8 pl-3 pr-9 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[6px] text-13px text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)] transition-colors"
                        required
                        placeholder="••••••••"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] focus:outline-none"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                </div>
            </div>

            {error && (
                <div className="text-[var(--text-danger)] text-11px font-medium">
                    {error}
                </div>
            )}

            <Button type="submit" className="w-full mt-2 h-8 text-13px" disabled={isLoading || !email || !password}>
                {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
        </form>
    );
};

export default LoginForm;
