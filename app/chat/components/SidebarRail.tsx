'use client';

import React from 'react';
import { PanelLeft, Search, User } from 'lucide-react';

interface SidebarRailProps {
  onToggleMainSidebar: () => void;
  isMainSidebarOpen: boolean;
}

export default function SidebarRail({ onToggleMainSidebar, isMainSidebarOpen }: SidebarRailProps) {
  // Shared icon button style for a unified look
  const railButtonStyle: React.CSSProperties = {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  return (
    <div 
      style={{
        width: 'var(--rail-width)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 0',
        zIndex: 60,
        gap: '20px',
        background: 'rgba(10, 10, 10, 0.4)', // Matches main sidebar glass
        backdropFilter: 'blur(20px)',
        top: '64px', // Align with main sidebar
        position: 'sticky',
      }}
    >
      {/* Top Toggle Button */}
      <button 
        onClick={onToggleMainSidebar}
        title={isMainSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
        style={{
          ...railButtonStyle,
          color: isMainSidebarOpen ? '#fff' : 'var(--text-secondary)',
          background: isMainSidebarOpen ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          e.currentTarget.style.color = '#fff';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = isMainSidebarOpen ? 'rgba(255, 255, 255, 0.08)' : 'transparent';
          e.currentTarget.style.color = isMainSidebarOpen ? '#fff' : 'var(--text-secondary)';
        }}
      >
        <PanelLeft size={22} strokeWidth={2} />
      </button>

      {/* Spacer for middle icons if you add them later */}
      <div style={{ flex: 1 }} />

      {/* Bottom Section */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        gap: '24px', 
        marginBottom: '20px', 
        paddingBottom: '10px' 
      }}>
                
        {/* Subtle Search/Action Icon */}
        {!isMainSidebarOpen && (
           <button 
             title="Search"
             style={{ 
               ...railButtonStyle, 
               opacity: 0.6,
               transition: 'all 0.2s ease'
             }}
             onMouseEnter={e => {
               e.currentTarget.style.opacity = '1';
               e.currentTarget.style.transform = 'scale(1.1)';
             }}
             onMouseLeave={e => {
               e.currentTarget.style.opacity = '0.6';
               e.currentTarget.style.transform = 'scale(1)';
             }}
           >
             <Search size={20} strokeWidth={2} />
           </button>
        )}
        
        {/* Profile Icon - Only visible when Rail is the primary interaction point */}
        {!isMainSidebarOpen && (
          <button 
            title="Profile"
            style={{
              ...railButtonStyle,
              width: '40px',
              height: '40px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '14px', 
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <User size={20} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}