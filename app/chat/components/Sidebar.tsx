'use client';

import React from 'react';
import { Plus, Settings, User, DollarSign } from 'lucide-react';

interface SidebarProps {
  activeAgentId: string;
  onSelectAgent: (id: string) => void;
  isOpen: boolean;
}

export default function Sidebar({ activeAgentId, onSelectAgent, isOpen }: SidebarProps) {
  // Shared styles for bottom navigation buttons
  const navButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: 'transparent',
    border: 'none',
    borderRadius: '10px',
    color: 'var(--text-secondary)',
    fontSize: '13.5px',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.2s ease',
    fontFamily: 'Inter, sans-serif',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    padding: '20px 12px 8px 12px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  };

  return (
    <aside
      className="app-sidebar"
      style={{
        width: isOpen ? '260px' : '0px',
        opacity: isOpen ? 1 : 0,
        visibility: isOpen ? 'visible' : 'hidden',
        background: 'rgba(10, 10, 10, 0.4)', // Subtle dark glass
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 50,
      }}
    >
      {/* Action Header */}
      <div style={{ padding: '20px 16px 12px' }}>
        <button
          style={{
            width: '100%',
            padding: '10px 12px',
            background: 'transparent', // Removed background
            border: '1px solid rgba(255, 255, 255, 0.15)', // Added subtle outline
            borderRadius: '10px',
            color: 'var(--text-primary)',
            fontSize: '13.5px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          }}
        >
          <Plus size={18} strokeWidth={2} />
          New Chat
        </button>
      </div>

      {/* Scrollable History */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
        <div style={sectionLabelStyle}>Today</div>
        <HistoryItem title="Refining Edge-OS Interface" active />
        <HistoryItem title="External Meeting Prep Rules" />

        <div style={sectionLabelStyle}>Previous 7 Days</div>
        <HistoryItem title="Market Research Analysis" />
        <HistoryItem title="Email Drafter Lines" />
      </div>

      {/* Footer Nav */}
      <div style={{ 
        padding: '12px', 
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex', 
        flexDirection: 'column', 
        gap: '4px' 
      }}>
        <button 
            style={navButtonStyle}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
        >
          <DollarSign size={18} strokeWidth={2} />
          Plans & Pricing
        </button>
        
        <button 
            style={navButtonStyle}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
        >
          <Settings size={18} strokeWidth={2} />
          Settings
        </button>

        <button 
          style={{
            ...navButtonStyle,
            marginTop: '8px',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <User size={18} strokeWidth={2} />
          John Doe
        </button>
      </div>
    </aside>
  );
}

// Sub-component for history items to keep code clean
function HistoryItem({ title, active = false }: { title: string; active?: boolean }) {
  return (
    <button
      style={{
        width: '100%',
        padding: '10px 12px',
        marginBottom: '2px',
        background: active ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
        border: 'none',
        borderRadius: '8px',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontSize: '13px',
        textAlign: 'left',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }
      }}
    >
      {title}
    </button>
  );
}