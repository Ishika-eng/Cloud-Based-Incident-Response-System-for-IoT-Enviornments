import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

let toastCount = 0;
let addToastFn = () => { };

export const toast = {
    success: (msg) => addToastFn({ id: ++toastCount, type: 'success', message: msg }),
    error: (msg) => addToastFn({ id: ++toastCount, type: 'error', message: msg }),
};

const Toast = () => {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        addToastFn = (t) => {
            setToasts(prev => {
                const newToasts = [...prev, t];
                return newToasts.slice(-3); // max 3 visible
            });
            setTimeout(() => {
                setToasts(prev => prev.filter(toastItem => toastItem.id !== t.id));
            }, 4000); // auto-dismiss 4 seconds
        };
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map(t => (
                <div key={t.id} className="min-w-[280px] bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[6px] shadow-lg flex items-center p-3 animate-in slide-in-from-right-8 fade-in duration-200">
                    {t.type === 'success' ? (
                        <CheckCircle className="text-[var(--safe)] w-4 h-4 mr-3 shrink-0" />
                    ) : (
                        <AlertCircle className="text-[var(--critical)] w-4 h-4 mr-3 shrink-0" />
                    )}
                    <span className="text-[var(--text-primary)] text-13px flex-1">{t.message}</span>
                    <button
                        onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] ml-3"
                        aria-label="Close Toast"
                    >
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default Toast;
