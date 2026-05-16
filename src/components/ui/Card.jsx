import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

export const Card = ({ children, className = '', hoverEffect = true }) => {
    const divRef = useRef(null);
    const [isFocused, setIsFocused] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    const handleMouseMove = (e) => {
        if (!divRef.current || isFocused) return;
        const rect = divRef.current.getBoundingClientRect();
        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleFocus = () => {
        setIsFocused(true);
        setOpacity(1);
    };

    const handleBlur = () => {
        setIsFocused(false);
        setOpacity(0);
    };

    const handleMouseEnter = () => setOpacity(1);
    const handleMouseLeave = () => setOpacity(0);

    return (
        <motion.div
            ref={divRef}
            onMouseMove={handleMouseMove}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            whileHover={hoverEffect ? { scale: 1.005, y: -2 } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`relative overflow-hidden bg-[rgba(10,10,15,0.7)] backdrop-blur-md border border-[var(--border-default)] rounded-[6px] shadow-2xl ${className}`}
        >
            <div
                className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
                style={{
                    opacity,
                    background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(0,255,65,.08), transparent 40%)`,
                }}
            />
            <div className="relative z-10 h-full flex flex-col">
                {children}
            </div>
        </motion.div>
    );
};

export const CardHeader = ({ title, action, className = '' }) => (
    <div className={`px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between ${className}`}>
        <h3 className="font-medium text-[var(--text-primary)] text-13px">{title}</h3>
        {action && <div>{action}</div>}
    </div>
);

export const CardContent = ({ children, className = '' }) => (
    <div className={`p-4 ${className}`}>
        {children}
    </div>
);

export default Card;
