"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { CSSProperties } from "react";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { resetSessionId } from "@/lib/sessionId";

interface SidebarProps {
  activeAgentId?: string;
  onSelectAgent?: (id: string) => void;
  isOpen: boolean;
  onToggle?: () => void;
  sidebarWidth?: number;
  onResize?: (e: React.MouseEvent) => void;
  showLoginModal?: boolean;
  onShowLoginModal?: (show: boolean) => void;
}

// Inline rename modal
function RenameModal({
  currentTitle,
  onSave,
  onCancel,
}: {
  currentTitle: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(currentTitle);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }} onClick={onCancel}>
      <div style={{ background: "#050505", border: "1px solid #1A1A1A", borderTop: "2px solid #EAEAEA", borderRadius: "4px", padding: "32px", width: "400px", maxWidth: "90vw", boxShadow: "0 20px 40px rgba(0,0,0,0.8)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: "12px", color: "#EAEAEA", fontFamily: '"Geist Mono",monospace', textTransform: "uppercase", letterSpacing: "1px", marginBottom: "16px", fontWeight: 600 }}>Rename Session</div>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSave(value); if (e.key === "Escape") onCancel(); }}
          style={{ width: "100%", background: "#000", border: "1px solid #222", borderRadius: "2px", color: "#EAEAEA", fontSize: "13px", fontFamily: '"Geist Mono",monospace', padding: "12px 16px", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
          onFocus={(e) => e.currentTarget.style.borderColor = "#555"}
          onBlur={(e) => e.currentTarget.style.borderColor = "#222"}
        />
        <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
          <button onClick={onCancel} style={{ flex: 1, background: "transparent", color: "#A1A1AA", border: "1px solid #333", padding: "12px", borderRadius: "2px", fontSize: "11px", fontFamily: '"Geist Mono",monospace', fontWeight: 700, textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#EAEAEA"; e.currentTarget.style.borderColor = "#666"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#A1A1AA"; e.currentTarget.style.borderColor = "#333"; }}>
            CANCEL
          </button>
          <button onClick={() => onSave(value)} style={{ flex: 1, background: "#EAEAEA", color: "#000", border: "1px solid #EAEAEA", padding: "12px", borderRadius: "2px", fontSize: "11px", fontFamily: '"Geist Mono",monospace', fontWeight: 700, textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#EAEAEA"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#EAEAEA"; e.currentTarget.style.color = "#000"; }}>
            SAVE
          </button>
        </div>
      </div>
    </div>
  );
}

// Toast for export feedback
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", background: "#0A0A0A", border: "1px solid #222", borderRadius: "2px", padding: "12px 24px", color: "#EAEAEA", fontSize: "11px", fontFamily: '"Geist Mono",monospace', fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", zIndex: 3000, whiteSpace: "nowrap", animation: "pipFade 0.2s ease-out" }}>
      {message}
    </div>
  );
}

// Extracted Right-Click Context Menu
interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  sessionId: string;
  sessionTitle: string;
  onRename: (id: string, title: string) => void;
  onExport: (id: string) => void;
  onDelete: (id: string) => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
}

function SessionContextMenu({
  visible,
  x,
  y,
  sessionId,
  sessionTitle,
  onRename,
  onExport,
  onDelete,
  menuRef
}: ContextMenuProps) {
  if (!visible) return null;

  const ctxBtn: React.CSSProperties = {
    width: "100%", padding: "10px 16px", background: "transparent", border: "none",
    color: "#A1A1AA", fontSize: "11px", fontWeight: 600, fontFamily: '"Geist Mono",monospace',
    textAlign: "left", letterSpacing: "1px", cursor: "pointer", transition: "all 0.2s ease",
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed", left: `${x}px`, top: `${y}px`,
        background: "#0A0A0A", border: "1px solid #222", borderRadius: "2px",
        padding: "4px 0", zIndex: 1000, minWidth: "150px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.8)"
      }}
    >
      <button
        onClick={() => onRename(sessionId, sessionTitle)}
        style={ctxBtn}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#111"; e.currentTarget.style.color = "#EAEAEA"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#A1A1AA"; }}
      >
        RENAME
      </button>
      <button
        onClick={() => onExport(sessionId)}
        style={ctxBtn}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#111"; e.currentTarget.style.color = "#EAEAEA"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#A1A1AA"; }}
      >
        EXPORT
      </button>

      <div style={{ height: "1px", background: "#222", margin: "4px 0" }} />

      <button
        onClick={() => onDelete(sessionId)}
        style={{ ...ctxBtn, color: "#ef4444" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        DELETE
      </button>
    </div>
  );
}

export default function Sidebar({
  activeAgentId,
  onSelectAgent,
  isOpen,
  onToggle,
  sidebarWidth = 260,
  onResize,
  showLoginModal,
  onShowLoginModal,
}: SidebarProps) {
  const router = useRouter();
  const { user, isSignedIn } = useUser();
  const [userSessions, setUserSessions] = useState<Array<{
    sessionId: string;
    updatedAt: Date | string;
    messageCount: number;
    lastMessage?: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [renameModal, setRenameModal] = useState<{ sessionId: string; currentTitle: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean; x: number; y: number; sessionId: string; sessionTitle: string;
  } | null>(null);

  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const MENU_W = 150;
  const MENU_H = 110;
  const clampPos = (x: number, y: number) => ({
    x: Math.min(x, window.innerWidth - MENU_W - 8),
    y: Math.min(y, window.innerHeight - MENU_H - 8),
  });

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return userSessions;
    const query = searchQuery.toLowerCase();
    return userSessions.filter((s) => {
      const title = (s.lastMessage || `Chat ${s.sessionId}`).toLowerCase();
      return title.includes(query) || s.sessionId.toLowerCase().includes(query);
    });
  }, [userSessions, searchQuery]);

  const sidebarStyles = useMemo(
    (): CSSProperties => ({
      width: isOpen ? `${sidebarWidth}px` : "0px",
      opacity: isOpen ? 1 : 0,
      visibility: isOpen ? "visible" : "hidden",
      background: "#000000",
      borderRight: "1px solid #1A1A1A",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflow: "hidden",
      fontFamily: '"Geist",sans-serif',
      zIndex: 50,
      position: "relative",
      transition: "width 0.2s ease, opacity 0.2s ease",
    }),
    [isOpen, sidebarWidth]
  );

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
    : (user?.primaryEmailAddress?.emailAddress ?? "USER");

  const initials = (user?.firstName?.[0] || "") + (user?.lastName?.[0] || "");
  const imageUrl = user?.imageUrl;

  useEffect(() => {
    if (isOpen && isSignedIn) fetchUserSessions();
  }, [isOpen, isSignedIn]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  const fetchUserSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/sessions", { credentials: "include" });
      if (response.ok) setUserSessions((await response.json()).sessions || []);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE", credentials: "include" });
      if (response.ok) {
        setUserSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
        setToast("Chat deleted");
      } else {
        setToast("Failed to delete chat");
      }
    } catch {
      setToast("Failed to delete chat");
    }
    setContextMenu(null);
  };

  const handleRenameSession = (sessionId: string, currentTitle: string) => {
    setContextMenu(null);
    setRenameModal({ sessionId, currentTitle });
  };

  const handleRenameSave = async (sessionId: string, newTitle: string) => {
    setRenameModal(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        setUserSessions((prev) =>
          prev.map((s) => s.sessionId === sessionId ? { ...s, lastMessage: newTitle } : s)
        );
        setToast("Renamed successfully");
      } else {
        setToast("Rename failed");
      }
    } catch {
      setToast("Rename failed");
    }
  };

  const handleExportSession = async (sessionId: string) => {
    setContextMenu(null);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/export`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chat-${sessionId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setToast("Exported successfully");
      } else {
        setToast("Export failed");
      }
    } catch {
      setToast("Export failed");
    }
  };

  const handleNewChat = () => {
    if (!isSignedIn) { onShowLoginModal?.(true); return; }
    try {
      const newSessionId = resetSessionId();
      router.push(`/chat/${newSessionId}`);
    } catch (error) {
      console.error("Error creating new chat:", error);
    }
  };

  return (
    <>
      {renameModal && (
        <RenameModal
          currentTitle={renameModal.currentTitle}
          onSave={(v) => handleRenameSave(renameModal.sessionId, v)}
          onCancel={() => setRenameModal(null)}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <aside style={sidebarStyles}>
        {/* Top Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 16px", borderBottom: "1px solid #1A1A1A" }}>
          <div style={{ color: "#EAEAEA", fontSize: "12px", fontWeight: 600, letterSpacing: "1px", fontFamily: '"Geist Mono",monospace' }}>SESSIONS</div>
          <button onClick={onToggle} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", padding: "4px", display: "flex", transition: "color 0.2s", fontFamily: '"Geist Mono",monospace', fontSize: "11px", fontWeight: 600 }}
            title="Close Sidebar"
            onMouseEnter={(e) => (e.currentTarget.style.color = "#EAEAEA")} onMouseLeave={(e) => (e.currentTarget.style.color = "#666")}>
            [X]
          </button>
        </div>

        {/* New Chat */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1A1A1A" }}>
          <button onClick={handleNewChat} style={{ width: "100%", padding: "12px 0", background: "#000000", border: "1px solid #222", borderRadius: "2px", color: "#EAEAEA", fontSize: "11px", fontFamily: '"Geist Mono",monospace', fontWeight: 600, letterSpacing: "0.5px", cursor: "pointer", transition: "all 0.2s ease", textTransform: "uppercase" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#EAEAEA"; e.currentTarget.style.color = "#000000"; e.currentTarget.style.borderColor = "#EAEAEA"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#000000"; e.currentTarget.style.color = "#EAEAEA"; e.currentTarget.style.borderColor = "#222"; }}>
            [ NEW SESSION ]
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1A1A1A" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#666", background: "#050505", border: "1px solid #222", padding: "10px 12px", borderRadius: "2px" }}>
            <span style={{ fontSize: "10px", fontFamily: '"Geist Mono",monospace' }}>&gt;</span>
            <input type="text" placeholder="Search logs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: "transparent", border: "none", outline: "none", color: "#EAEAEA", fontSize: "12px", width: "100%", fontFamily: '"Geist Mono",monospace' }} />
          </div>
        </div>

        {/* Chat list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 12px" }}>
          {loading ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#555", fontFamily: '"Geist Mono",monospace', fontSize: "10px", letterSpacing: "1px" }}>[ LOADING LOGS... ]</div>
          ) : !isSignedIn ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#888", fontFamily: '"Geist Mono",monospace' }}>
              <div style={{ fontSize: "11px", marginBottom: "8px", fontWeight: 600, letterSpacing: "1px", color: "#EAEAEA" }}>AUTH REQUIRED</div>
              <div style={{ fontSize: "10px", color: "#555" }}>Log in to view history</div>
            </div>
          ) : filteredSessions.length > 0 ? (
            <>
              <div style={{ fontSize: "10px", color: "#555", fontFamily: '"Geist Mono",monospace', textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px", paddingLeft: "8px", fontWeight: 600 }}>
                SESSIONS {searchQuery && `(${filteredSessions.length})`}
              </div>
              {filteredSessions.map((session) => (
                <HistoryItem
                  key={session.sessionId}
                  sessionId={session.sessionId}
                  title={session.lastMessage || `Chat ${session.messageCount} messages`}
                  timestamp={session.updatedAt}
                  onNavigate={(id) => router.push(`/chat/${id}`)}
                  onContextMenu={(e, sessionId, sessionTitle) => {
                    e.preventDefault();
                    const { x, y } = clampPos(e.clientX, e.clientY);
                    setContextMenu({ visible: true, x, y, sessionId, sessionTitle });
                  }}
                />
              ))}
            </>
          ) : searchQuery ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#888", fontFamily: '"Geist Mono",monospace' }}>
              <div style={{ fontSize: "11px", marginBottom: "8px", fontWeight: 600, letterSpacing: "1px", color: "#EAEAEA" }}>NO RESULTS</div>
              <div style={{ fontSize: "10px", color: "#555" }}>No chats match &quot;{searchQuery}&quot;</div>
            </div>
          ) : (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#888", fontFamily: '"Geist Mono",monospace' }}>
              <div style={{ fontSize: "11px", marginBottom: "8px", fontWeight: 600, letterSpacing: "1px", color: "#EAEAEA" }}>NO HISTORY</div>
              <div style={{ fontSize: "10px", color: "#555" }}>Initialize a new session</div>
            </div>
          )}
        </div>

        {/* ───────────────────────────────────────────── */}
        {/* FIXED FOOTER (USER IDENTIFIER & MENU)         */}
        {/* ───────────────────────────────────────────── */}
        <div style={{ background: "#050505", borderTop: "1px solid #1A1A1A", padding: "16px", position: "relative", flexShrink: 0 }}>

          {/* THE POP-UP MENU */}
          {showUserMenu && isSignedIn && (
            <div ref={userMenuRef} style={{ position: "absolute", bottom: "100%", left: "16px", width: "calc(100% - 32px)", background: "#050505", border: "1px solid #1A1A1A", borderRadius: "2px", padding: "8px 0", marginBottom: "8px", zIndex: 100, boxShadow: "0 -4px 20px rgba(0,0,0,0.8)", animation: "pipFade 0.15s ease-out" }}>
              <button onClick={() => window.location.href = "/pricing"} style={popupMenuBtn}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#111"; e.currentTarget.style.color = "#EAEAEA"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#888"; }}>
                PLANS & PRICING
              </button>
              <button onClick={() => window.location.href = "/settings"} style={popupMenuBtn}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#111"; e.currentTarget.style.color = "#EAEAEA"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#888"; }}>
                SETTINGS
              </button>

              <div style={{ height: "1px", background: "#1A1A1A", margin: "8px 0" }} />

              <SignOutButton>
                <button style={{ ...popupMenuBtn, color: "#666" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.05)"; e.currentTarget.style.color = "#ef4444"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#666"; }}>
                  SIGN OUT
                </button>
              </SignOutButton>
            </div>
          )}

          {/* THE TRIGGER BUTTON WITH REAL NAME & IMAGE */}
          {isSignedIn ? (
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", background: showUserMenu ? "#111" : "transparent", border: "none", color: showUserMenu ? "#EAEAEA" : "#888", fontSize: "12px", fontWeight: 600, fontFamily: '"Geist Mono",monospace', letterSpacing: "0.5px", cursor: "pointer", transition: "all 0.2s ease", padding: "8px", borderRadius: "2px", textTransform: "uppercase" }}
              onMouseEnter={(e) => { if (!showUserMenu) { e.currentTarget.style.background = "#0A0A0A"; e.currentTarget.style.color = "#EAEAEA"; } }}
              onMouseLeave={(e) => { if (!showUserMenu) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#888"; } }}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Avatar"
                  style={{ width: "24px", height: "24px", borderRadius: "2px", border: "1px solid #333", objectFit: "cover", flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: "24px", height: "24px", background: "#000", border: "1px solid #333", borderRadius: "2px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#EAEAEA", flexShrink: 0 }}>
                  {initials || "U"}
                </div>
              )}
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {displayName}
              </span>
            </button>
          ) : (
            <button onClick={() => window.location.href = "/login"} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", background: "#EAEAEA", border: "none", color: "#000000", fontSize: "11px", fontWeight: 700, fontFamily: '"Geist Mono",monospace', textTransform: "uppercase", letterSpacing: "1px", cursor: "pointer", transition: "background 0.2s ease", padding: "12px", borderRadius: "2px" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#FFFFFF")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#EAEAEA")}>
              AUTHENTICATE
            </button>
          )}
        </div>

        {/* Resize handle */}
        {isOpen && onResize && (
          <div style={{ position: "absolute", right: -2, top: 0, width: "8px", height: "100%", background: "transparent", cursor: "col-resize", zIndex: 60, transition: "background 0.2s ease" }}
            onMouseDown={onResize}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#333"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }} />
        )}

        {/* The new dedicated Right-Click Context Menu */}
        <SessionContextMenu
          visible={contextMenu?.visible ?? false}
          x={contextMenu?.x ?? 0}
          y={contextMenu?.y ?? 0}
          sessionId={contextMenu?.sessionId ?? ""}
          sessionTitle={contextMenu?.sessionTitle ?? ""}
          onRename={handleRenameSession}
          onExport={handleExportSession}
          onDelete={handleDeleteSession}
          menuRef={contextMenuRef}
        />
      </aside>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes pipFade { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}} />
    </>
  );
}

const popupMenuBtn: CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "flex-start",
  width: "100%", background: "transparent", border: "none", color: "#888",
  fontSize: "12px", fontWeight: 600, fontFamily: '"Geist Mono",monospace',
  textTransform: "uppercase", letterSpacing: "1px", cursor: "pointer",
  transition: "all 0.2s ease", padding: "12px 16px",
};

function HistoryItem({ sessionId, title, timestamp, active = false, onNavigate, onContextMenu }: {
  sessionId: string; title: string; timestamp: Date | string; active?: boolean;
  onNavigate?: (sessionId: string) => void;
  onContextMenu?: (e: React.MouseEvent, sessionId: string, sessionTitle: string) => void;
}) {
  const formatDate = (date: Date | string) => {
    const now = new Date();
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const diffTime = Math.abs(now.getTime() - dateObj.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return dateObj.toLocaleDateString();
  };

  return (
    <button style={{ width: "100%", padding: "12px", marginBottom: "4px", background: active ? "#0A0A0A" : "transparent", border: "1px solid", borderColor: active ? "#222" : "transparent", borderRadius: "2px", color: active ? "#EAEAEA" : "#888", fontSize: "13px", fontFamily: '"Geist",sans-serif', textAlign: "left", cursor: "pointer", wordWrap: "break-word", whiteSpace: "normal", transition: "all 0.2s ease", display: "flex", alignItems: "flex-start", gap: "10px" }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "#050505"; e.currentTarget.style.color = "#EAEAEA"; e.currentTarget.style.borderColor = "#1A1A1A"; } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#888"; e.currentTarget.style.borderColor = "transparent"; } }}
      onClick={() => { onNavigate?.(sessionId); }}
      onContextMenu={(e) => { onContextMenu?.(e, sessionId, title); }}>
      <div style={{ color: "#444", fontFamily: '"Geist Mono",monospace', fontSize: "12px", marginTop: "2px" }}>&gt;</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <div style={{ lineHeight: "1.4" }}>{title}</div>
        <div style={{ fontSize: "10px", color: "#555", fontFamily: '"Geist Mono",monospace', textTransform: "uppercase", letterSpacing: "0.5px" }}>{formatDate(timestamp)}</div>
      </div>
    </button>
  );
}