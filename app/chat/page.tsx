'use client';

import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import LoginModal from './components/LoginModal';

const agentNames: Record<string, string> = {
    '1': 'External Meeting Prep Ag...',
    '2': 'Market Research',
    '3': 'Email Drafter',
    '4': 'Lead Enrichment',
};

export default function Home() {
    const [activeAgentId, setActiveAgentId] = useState('1');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Closed by default as requested
    const [showLoginModal, setShowLoginModal] = useState(false);

    const handleLoginModalClose = () => {
        setShowLoginModal(false);
    };

    const handleLoginRedirect = () => {
        window.location.href = "/login";
    };

    return (
        <>
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
                        showLoginModal={showLoginModal}
                        onShowLoginModal={setShowLoginModal}
                    />

                    <ChatPanel
                        agentName={agentNames[activeAgentId]}
                        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                        isSidebarOpen={isSidebarOpen}
                        showLoginModal={showLoginModal}
                        onShowLoginModal={setShowLoginModal}
                    />
                </div>
            </div>
            
            <LoginModal
                isOpen={showLoginModal}
                onClose={handleLoginModalClose}
                onLogin={handleLoginRedirect}
            />
        </>
    );
}