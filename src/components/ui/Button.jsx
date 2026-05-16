import React from 'react';

const Button = ({
    children,
    variant = 'primary',
    size = 'default',
    className = '',
    ...props
}) => {
    const baseStyles = "inline-flex items-center justify-center font-medium rounded-[6px] transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed text-13px";

    const sizeStyles = {
        small: "h-[28px] px-2 text-11px",
        default: "h-[32px] px-3",
        large: "h-[36px] px-4",
    };

    const variantStyles = {
        primary: "bg-[var(--low)] hover:opacity-90 text-white border border-transparent",
        secondary: "bg-transparent hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-default)]",
        danger: "bg-[var(--critical)] hover:opacity-90 text-white border border-transparent",
        ghost: "bg-transparent hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-transparent",
    };

    return (
        <button
            className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
