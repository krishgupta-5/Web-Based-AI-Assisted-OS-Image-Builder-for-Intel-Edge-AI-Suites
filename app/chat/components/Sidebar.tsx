'use client';

import React from 'react';
import { PanelLeft, Edit, Search, LogIn } from 'lucide-react';

interface SidebarProps {
  activeAgentId?: string;
  onSelectAgent?: (id: string) => void;
  isOpen: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ activeAgentId, onSelectAgent, isOpen, onToggle }: SidebarProps) {
  return (
    <aside
      className="app-sidebar"
      style={{
        width: isOpen ? '260px' : '0px',
        opacity: isOpen ? 1 : 0,
        visibility: isOpen ? 'visible' : 'hidden',
        background: '#000000',
        borderRight: '1px solid #1A1A1A',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        fontFamily: '"Geist", sans-serif', // Default to Geist for lists
        zIndex: 50,
      }}
    >
      {/* Top Header */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '16px 20px',
          borderBottom: '1px solid #1A1A1A' 
        }}
      >
        <button onClick={onToggle} 
          style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 0, display: 'flex', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#EAEAEA'}
          onMouseLeave={e => e.currentTarget.style.color = '#888'}
        >
          <PanelLeft size={16} strokeWidth={2} />
        </button>
        
        <div style={{ 
          color: '#EAEAEA', 
          fontSize: '12px', 
          fontWeight: 600, 
          letterSpacing: '1px', 
          fontFamily: '"Geist Mono", monospace' 
        }}>
          EDGE-OS.CHAT
        </div>
        
        <button onClick={onToggle} 
          style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 0, display: 'flex', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#EAEAEA'}
          onMouseLeave={e => e.currentTarget.style.color = '#888'}
        >
          <Edit size={16} strokeWidth={2} />
        </button>
      </div>

      {/* New Session Button Area */}
      <div style={{ padding: '20px', borderBottom: '1px solid #1A1A1A' }}>
        <button
          style={{
            width: '100%',
            padding: '12px 0',
            background: '#000000',
            border: '1px solid #222',
            borderRadius: '2px', // Sharp minimal corners
            color: '#EAEAEA', 
            fontSize: '11px',
            fontFamily: '"Geist Mono", monospace',
            fontWeight: 600,
            letterSpacing: '0.5px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textTransform: 'uppercase',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#EAEAEA';
            e.currentTarget.style.color = '#000000';
            e.currentTarget.style.borderColor = '#EAEAEA';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#000000';
            e.currentTarget.style.color = '#EAEAEA';
            e.currentTarget.style.borderColor = '#222';
          }}
        >
          [ NEW SESSION ]
        </button>
      </div>

      {/* Search Input */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #1A1A1A' }}>
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            color: '#666',
            background: '#0A0A0A',
            border: '1px solid #222',
            padding: '8px 12px',
            borderRadius: '2px'
          }}
        >
          <Search size={14} strokeWidth={2} />
          <input
            type="text"
            placeholder="Search logs..."
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#EAEAEA',
              fontSize: '12px',
              width: '100%',
              fontFamily: '"Geist Mono", monospace',
            }}
            onFocus={e => e.currentTarget.style.outline = 'none'}
          />
        </div>
      </div>

      {/* Threads List Area (Scrollable state) */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>
        <div style={{ 
          fontSize: '10px', 
          color: '#666', 
          fontFamily: '"Geist Mono", monospace', 
          textTransform: 'uppercase', 
          letterSpacing: '1px', 
          marginBottom: '12px',
          paddingLeft: '8px' 
        }}>
          Recent Activity
        </div>
        
        {/* Render HistoryItem components here when you have data */}
        {/* <HistoryItem title="Auth Flow Implementation" active /> */}
        {/* <HistoryItem title="Database Schema Refactor" /> */}
      </div>

      {/* Bottom Login Area */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #1A1A1A', background: '#000' }}>
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: '#888',
            fontSize: '11px',
            fontWeight: 600,
            fontFamily: '"Geist Mono", monospace',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            cursor: 'pointer',
            transition: 'color 0.2s ease',
            padding: 0
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#EAEAEA'}
          onMouseLeave={e => e.currentTarget.style.color = '#888'}
        >
          <span>System Login</span>
          <LogIn size={14} strokeWidth={2} />
        </button>
      </div>
    </aside>
  );
}

// Updated HistoryItem component to match the new brutalist design
function HistoryItem({ title, active = false }: { title: string; active?: boolean }) {
  return (
    <button
      style={{
        width: '100%',
        padding: '10px 12px',
        marginBottom: '4px',
        background: active ? '#0A0A0A' : 'transparent',
        border: '1px solid',
        borderColor: active ? '#222' : 'transparent',
        borderRadius: '2px',
        color: active ? '#EAEAEA' : '#888',
        fontSize: '13px',
        fontFamily: '"Geist", sans-serif',
        textAlign: 'left',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = '#0A0A0A';
          e.currentTarget.style.color = '#EAEAEA';
          e.currentTarget.style.borderColor = '#1A1A1A';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#888';
          e.currentTarget.style.borderColor = 'transparent';
        }
      }}
    >
      <span style={{ 
        color: active ? '#38BDF8' : '#444', // Cyan active marker, dark gray inactive
        fontFamily: '"Geist Mono", monospace',
        fontSize: '11px' 
      }}>
        {active ? '●' : '○'}
      </span>
      {title}
    </button>
  );
}
