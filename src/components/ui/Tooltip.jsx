import React, { useState } from 'react';

const Tooltip = ({ text, children }) => {
    const [show, setShow] = useState(false);

    return (
        <div
            className="relative flex items-center"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
        >
            {children}
            {show && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[var(--bg-overlay)] border border-[var(--border-default)] text-[var(--text-primary)] text-11px rounded-[6px] whitespace-nowrap z-50 shadow-md">
                    {text}
                </div>
            )}
        </div>
    );
};

export default Tooltip;
