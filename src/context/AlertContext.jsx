import { createContext, useState, useCallback } from 'react';

export const AlertContext = createContext(null);

export const AlertProvider = ({ children }) => {
    const [criticalAlerts, setCriticalAlerts] = useState([]);
    const [notifications, setNotifications] = useState([]);

    const addCriticalAlert = useCallback((alert) => {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const newAlert = { ...alert, id, timestamp: alert.timestamp || new Date().toISOString() };

        setCriticalAlerts((prev) => [...prev, newAlert]);

        // Auto dismiss handled by the banner component state or context. 
        // Handling it here ensures the state cleans up.
        setTimeout(() => {
            removeCriticalAlert(id);
        }, 10000);
    }, []);

    const removeCriticalAlert = useCallback((id) => {
        setCriticalAlerts((prev) => prev.filter(a => a.id !== id));
    }, []);

    const addNotification = useCallback((notif) => {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        setNotifications((prev) => [{
            ...notif,
            id,
            read: false,
            timestamp: notif.timestamp || new Date().toISOString()
        }, ...prev]);
    }, []);

    const markAllRead = useCallback(() => {
        setNotifications((prev) => prev.map(n => ({ ...n, read: true })));
    }, []);

    const value = {
        criticalAlerts,
        addCriticalAlert,
        removeCriticalAlert,
        notifications,
        addNotification,
        markAllRead
    };

    return (
        <AlertContext.Provider value={value}>
            {children}
        </AlertContext.Provider>
    );
};
