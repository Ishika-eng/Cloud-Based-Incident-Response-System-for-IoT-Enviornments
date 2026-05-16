import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';
import { ROUTES } from './constants/routes';

import PageContainer from './components/layout/PageContainer';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import Incidents from './pages/Incidents';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import ThreatMapPage from './pages/ThreatMapPage';
import LiveMonitor from './pages/LiveMonitor';

// Global UI
import CriticalAlertBanner from './components/alerts/CriticalAlertBanner';
import Toast from './components/ui/Toast';
import CommandPalette from './components/ui/CommandPalette';

function App() {
    return (
        <AuthProvider>
            <AlertProvider>
                <Router>
                    <CriticalAlertBanner />
                    <Routes>
                        <Route path={ROUTES.LOGIN} element={<Login />} />

                        <Route path="/" element={<ProtectedRoute><PageContainer /></ProtectedRoute>}>
                            <Route index element={<Dashboard />} />
                            <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
                            <Route path={ROUTES.DEVICES} element={<Devices />} />
                            <Route path={ROUTES.INCIDENTS} element={<Incidents />} />
                            <Route path={ROUTES.ANALYTICS} element={<Analytics />} />
                            <Route path={ROUTES.LIVE_MONITOR} element={<LiveMonitor />} />
                            <Route path={ROUTES.THREATMAP} element={<ThreatMapPage />} />
                            <Route path={ROUTES.SETTINGS} element={<Settings />} />
                        </Route>
                    </Routes>
                    <CommandPalette />
                    <Toast />
                </Router>
            </AlertProvider>
        </AuthProvider>
    );
}

export default App;
