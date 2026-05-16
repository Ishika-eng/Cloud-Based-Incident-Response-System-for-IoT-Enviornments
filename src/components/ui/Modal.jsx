import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[6px] w-full max-w-md shadow-2xl p-5 relative overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-[var(--text-primary)] font-medium text-13px">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="text-[var(--text-secondary)] text-13px">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
