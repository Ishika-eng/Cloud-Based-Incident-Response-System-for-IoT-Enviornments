import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ParticleBackground from '../ui/ParticleBackground';

const PageContainer = () => {
    const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024 && !isCollapsed) setIsCollapsed(true);
            if (window.innerWidth >= 1024 && isCollapsed) setIsCollapsed(false);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isCollapsed]);

    return (
        <div className="min-h-screen flex text-[var(--text-primary)] relative overflow-hidden" style={{ backgroundColor: '#0d1117' }}>
            <ParticleBackground />
            
            {/* Global CRT Overlays */}
            <div className="pointer-events-none fixed inset-0 z-50 scanline-overlay opacity-20"></div>
            <div className="pointer-events-none fixed inset-0 z-40 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.6)_100%)]"></div>

            <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

            <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isCollapsed ? 'ml-[52px]' : 'ml-[220px]'}`}>
                <Topbar isSidebarCollapsed={isCollapsed} />

                <main className="flex-1 p-6 overflow-x-hidden">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default PageContainer;
