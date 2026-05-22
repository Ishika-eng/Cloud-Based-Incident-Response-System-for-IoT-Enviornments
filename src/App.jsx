import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';
import { ROUTES } from './constants/routes';

import PageContainer from './components/layout/PageContainer';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { WebSocketProvider } from './hooks/useWebSocket';

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

// ── Error Boundary ─────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        console.error('[ThreatNest] Render error caught by boundary:', error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh', background: '#09090b', color: '#e6edf3',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', fontFamily: 'monospace', padding: '2rem',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                        ThreatNest encountered an error
                    </div>
                    <div style={{ fontSize: 12, color: '#8b949e', maxWidth: 480, marginBottom: 24 }}>
                        {this.state.error?.message || 'Unknown error'}
                    </div>
                    <button
                        onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
                        style={{
                            background: '#388bfd', color: '#fff', border: 'none',
                            padding: '8px 20px', borderRadius: 6, cursor: 'pointer', fontSize: 13
                        }}
                    >
                        Reload
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <AlertProvider>
                    <WebSocketProvider>
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
                    </WebSocketProvider>
                </AlertProvider>
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default App;
