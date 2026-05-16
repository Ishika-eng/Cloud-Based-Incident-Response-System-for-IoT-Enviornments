import React from 'react';

const Skeleton = ({ className = '' }) => (
    <div className={`animate-pulse bg-[var(--bg-hover)] rounded-[6px] ${className}`} />
);

export default Skeleton;
