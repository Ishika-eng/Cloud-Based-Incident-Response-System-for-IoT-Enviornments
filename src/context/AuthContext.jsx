import { createContext, useState, useEffect } from 'react';
import { login as apiLogin, logout as apiLogout, setApiAuthHooks, initDashboard } from '../services/api.js';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Inject auth getters into API interceptors to avoid circular dependencies
        setApiAuthHooks(
            () => token, // Can't just pass `token` string since closure will capture initial state, so we pass a ref/getter if needed. Wait, passing `() => token` works if we re-register on token change.
            () => handleLogout()
        );
    }, [token]);

    const handleLogin = async (email, password) => {
        try {
            setLoading(true);
            const res = await apiLogin(email, password);
            setUser(res.data.user);
            setToken(res.data.token);
            // Register dashboard device with backend to get API token
            initDashboard().catch((e) => console.warn('Backend init failed (non-critical):', e));
            return res.data;
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            setLoading(true);
            if (token) {
                await apiLogout();
            }
        } catch (err) {
            // Ignore logout errors
        } finally {
            setUser(null);
            setToken(null);
            setLoading(false);
        }
    };

    const value = {
        user,
        token,
        role: user?.role || null,
        isAdmin: user?.role === 'admin',
        login: handleLogin,
        logout: handleLogout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
