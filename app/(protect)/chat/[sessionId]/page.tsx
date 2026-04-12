'use client';

import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import ChatPanel from '../components/ChatPanel';
// SidebarRail component was removed as requested
import { useParams } from 'next/navigation';

const agentNames: Record<string, string> = {
    '1': 'External Meeting Prep Ag...',
    '2': 'Market Research',
    '3': 'Email Drafter',
    '4': 'Lead Enrichment',
};

export default function ChatSession() {
    const [activeAgentId, setActiveAgentId] = useState('1');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(260);
    const params = useParams();
    const sessionId = params.sessionId as string;

    const handleResize = (e: MouseEvent) => {
        e.preventDefault();
        const newWidth = e.clientX;
        if (newWidth >= 200 && newWidth <= 500) {
            setSidebarWidth(newWidth);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';
        
        let rafId: number;
        let lastWidth = sidebarWidth;
        
        const handleMouseMove = (moveEvent: MouseEvent) => {
            moveEvent.preventDefault();
            
            // Cancel previous animation frame
            if (rafId) {
                cancelAnimationFrame(rafId);
            }
            
            // Use requestAnimationFrame for smooth updates
            rafId = requestAnimationFrame(() => {
                const newWidth = moveEvent.clientX;
                if (newWidth >= 200 && newWidth <= 500 && newWidth !== lastWidth) {
                    lastWidth = newWidth;
                    setSidebarWidth(newWidth);
                }
            });
        };

        const handleMouseUp = () => {
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            
            // Cancel any pending animation frame
            if (rafId) {
                cancelAnimationFrame(rafId);
            }
            
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <div
            className="glass-panel"
            style={{
                display: 'flex',
                height: '100vh',
                width: '100vw',
                overflow: 'hidden',
                position: 'relative',
                zIndex: 1,
                borderRadius: 0,
            }}
        >
            <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
                <Sidebar
                    activeAgentId={activeAgentId}
                    onSelectAgent={setActiveAgentId}
                    isOpen={isSidebarOpen}
                    onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                    sidebarWidth={sidebarWidth}
                    onResize={handleMouseDown}
                />

                
                <ChatPanel
                    agentName={agentNames[activeAgentId]}
                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    isSidebarOpen={isSidebarOpen}
                    sessionId={sessionId}
                />
            </div>
        </div>
    );
}
