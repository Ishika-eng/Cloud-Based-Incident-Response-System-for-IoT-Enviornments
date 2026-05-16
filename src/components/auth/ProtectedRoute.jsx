import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';
import Spinner from '../ui/Spinner';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
    const { user, loading, isAdmin } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[var(--bg-base)]">
                <Spinner size={32} />
            </div>
        );
    }

    if (!user) {
        return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
    }

    if (requireAdmin && !isAdmin) {
        return <Navigate to={ROUTES.DASHBOARD} replace />;
    }

    return children;
};

export default ProtectedRoute;
