"use client";

import React, { useState, useEffect, useMemo } from "react";
import { CSSProperties } from "react";
import { useUser, SignOutButton, SignInButton } from "@clerk/nextjs";
import { resetSessionId } from "@/app/api/generate/Sessionid";

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
  const { user, isSignedIn } = useUser();
  const [userSessions, setUserSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Memoize sidebar styles to prevent unnecessary re-renders
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
      fontFamily: '"Geist", sans-serif',
      zIndex: 50,
      position: "relative",
      transition: "width 0.2s ease, opacity 0.2s ease",
    }),
    [isOpen, sidebarWidth],
  );

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
    : (user?.emailAddresses?.[0]?.emailAddress ?? "Account");

  useEffect(() => {
    if (isOpen && isSignedIn) {
      fetchUserSessions();
    }
  }, [isOpen, isSignedIn]);

  const fetchUserSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/sessions", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUserSessions(data.sessions || []);
      } else {
        console.error(
          "Failed to fetch sessions:",
          response.status,
          response.statusText,
        );
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    if (!isSignedIn) {
      // Show login modal for unauthenticated users
      onShowLoginModal?.(true);
      return;
    }
    
    try {
      const newSessionId = resetSessionId();
      window.location.href = `/chat/${newSessionId}`;
    } catch (error) {
      console.error("Error creating new chat:", error);
    }
  };

  return (
    <aside className="app-sidebar" style={sidebarStyles}>
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid #1A1A1A",
        }}
      >
        <button
          onClick={onToggle}
          style={{
            background: "none",
            border: "none",
            color: "#888",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            transition: "color 0.2s",
            fontFamily: '"Geist Mono", monospace',
            fontSize: "12px",
            fontWeight: 600,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#EAEAEA")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#888")}
        >
          [X]
        </button>
        <div
          style={{
            color: "#EAEAEA",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "1px",
            fontFamily: '"Geist Mono", monospace',
          }}
        >
          EDGE-OS.CHAT
        </div>
        <div style={{ width: "20px" }}></div> {/* Spacer for alignment */}
      </div>

      {/* New Session Button Area */}
      <div style={{ padding: "20px", borderBottom: "1px solid #1A1A1A" }}>
        <button
          onClick={handleNewChat}
          style={{
            width: "100%",
            padding: "12px 0",
            background: "#000000",
            border: "1px solid #222",
            borderRadius: "2px",
            color: "#EAEAEA",
            fontSize: "11px",
            fontFamily: '"Geist Mono", monospace',
            fontWeight: 600,
            letterSpacing: "0.5px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            textTransform: "uppercase",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#EAEAEA";
            e.currentTarget.style.color = "#000000";
            e.currentTarget.style.borderColor = "#EAEAEA";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#000000";
            e.currentTarget.style.color = "#EAEAEA";
            e.currentTarget.style.borderColor = "#222";
          }}
        >
          [ NEW CHAT ]
        </button>
      </div>

      {/* Search Input */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #1A1A1A" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: "#666",
            background: "#0A0A0A",
            border: "1px solid #222",
            padding: "8px 12px",
            borderRadius: "2px",
          }}
        >
          <span
            style={{ fontSize: "10px", fontFamily: '"Geist Mono", monospace' }}
          >
            /
          </span>
          <input
            type="text"
            placeholder="Search logs..."
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#EAEAEA",
              fontSize: "12px",
              width: "100%",
              fontFamily: '"Geist Mono", monospace',
            }}
            onFocus={(e) => (e.currentTarget.style.outline = "none")}
          />
        </div>
      </div>

      {/* Chats Section */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px" }}>
        {loading ? (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              color: "#888",
              fontFamily: '"Geist Mono", monospace',
              fontSize: "11px",
            }}
          >
            [ LOADING CHATS... ]
          </div>
        ) : !isSignedIn ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "#888",
              fontFamily: '"Geist Mono", monospace',
            }}
          >
            <div style={{ fontSize: "12px", marginBottom: "8px" }}>
              AUTH REQUIRED
            </div>
            <div style={{ fontSize: "10px", opacity: 0.7 }}>
              Log in to view history
            </div>
          </div>
        ) : userSessions.length > 0 ? (
          <>
            <div
              style={{
                fontSize: "10px",
                color: "#666",
                fontFamily: '"Geist Mono", monospace',
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: "12px",
                paddingLeft: "8px",
              }}
            >
              CHATS
            </div>
            {userSessions.map((session) => (
              <HistoryItem
                key={session.sessionId}
                sessionId={session.sessionId}
                title={
                  session.lastMessage ||
                  `Chat with ${session.messageCount} messages`
                }
                timestamp={session.updatedAt}
              />
            ))}
          </>
        ) : (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "#888",
              fontFamily: '"Geist Mono", monospace',
            }}
          >
            <div style={{ fontSize: "12px", marginBottom: "8px" }}>
              NO HISTORY
            </div>
            <div style={{ fontSize: "10px", opacity: 0.7 }}>
              Initialize a new session
            </div>
          </div>
        )}
      </div>

      {/* Footer Nav */}
      <div
        style={{
          padding: "12px",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <button
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            width: "100%",
            background: "transparent",
            border: "none",
            color: "#888",
            fontSize: "11px",
            fontWeight: 600,
            fontFamily: '"Geist Mono", monospace',
            textTransform: "uppercase",
            letterSpacing: "1px",
            cursor: "pointer",
            transition: "color 0.2s ease, background 0.2s ease",
            padding: "8px 12px",
            borderRadius: "2px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            e.currentTarget.style.color = "#EAEAEA";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#888";
          }}
        >
          PLANS & PRICING
        </button>

        {isSignedIn && (
          <button
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              width: "100%",
              background: "transparent",
              border: "none",
              color: "#888",
              fontSize: "11px",
              fontWeight: 600,
              fontFamily: '"Geist Mono", monospace',
              textTransform: "uppercase",
              letterSpacing: "1px",
              cursor: "pointer",
              transition: "color 0.2s ease, background 0.2s ease",
              padding: "8px 12px",
              borderRadius: "2px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              e.currentTarget.style.color = "#EAEAEA";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#888";
            }}
          >
            SETTINGS
          </button>
        )}

        {isSignedIn ? (
          <>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                width: "100%",
                background: "transparent",
                border: "none",
                color: "#888",
                fontSize: "11px",
                fontWeight: 600,
                fontFamily: '"Geist Mono", monospace',
                textTransform: "uppercase",
                letterSpacing: "1px",
                cursor: "pointer",
                transition: "color 0.2s ease, background 0.2s ease",
                padding: "8px 12px",
                borderRadius: "2px",
                marginTop: "8px",
                borderTop: "1px solid #1A1A1A",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.color = "#EAEAEA";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#888";
              }}
            >
              {displayName}
            </button>

            <SignOutButton>
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  color: "#666",
                  fontSize: "11px",
                  fontWeight: 600,
                  fontFamily: '"Geist Mono", monospace',
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  cursor: "pointer",
                  transition: "color 0.2s ease, background 0.2s ease",
                  padding: "8px 12px",
                  borderRadius: "2px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,60,60,0.08)";
                  e.currentTarget.style.color = "#ff6b6b";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#666";
                }}
              >
                SIGN OUT
              </button>
            </SignOutButton>
          </>
        ) : (
          <button
            onClick={() => window.location.href = "/login"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              background: "#EAEAEA",
              border: "none",
              color: "#000000",
              fontSize: "11px",
              fontWeight: 600,
              fontFamily: '"Geist Mono", monospace',
              textTransform: "uppercase",
              letterSpacing: "1px",
              cursor: "pointer",
              transition: "background 0.2s ease",
              padding: "10px 12px",
              borderRadius: "2px",
              marginTop: "8px",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "#FFFFFF")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "#EAEAEA")
            }
          >
            LOG IN
          </button>
        )}
      </div>

      {/* Resize Handle */}
      {isOpen && onResize && (
        <div
          style={{
            position: "absolute",
            right: -2,
            top: 0,
            width: "8px",
            height: "100%",
            background: "transparent",
            cursor: "col-resize",
            zIndex: 60,
            transition: "background 0.2s ease",
          }}
          onMouseDown={onResize}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#333";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        />
      )}
    </aside>
  );
}

// Sub-component for history items to keep code clean
function HistoryItem({
  sessionId,
  title,
  timestamp,
  active = false,
}: {
  sessionId: string;
  title: string;
  timestamp: Date | string;
  active?: boolean;
}) {
  const formatDate = (date: Date | string) => {
    const now = new Date();
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const diffTime = Math.abs(now.getTime() - dateObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return dateObj.toLocaleDateString();
  };

  return (
    <button
      style={{
        width: "100%",
        padding: "10px 12px",
        marginBottom: "4px",
        background: active ? "#0A0A0A" : "transparent",
        border: "1px solid",
        borderColor: active ? "#222" : "transparent",
        borderRadius: "2px",
        color: active ? "#EAEAEA" : "#888",
        fontSize: "13px",
        fontFamily: '"Geist", sans-serif',
        textAlign: "left",
        cursor: "pointer",
        wordWrap: "break-word",
        whiteSpace: "normal",
        transition: "all 0.2s ease",
        display: "flex",
        alignItems: "flex-start",
        gap: "8px",
        minHeight: "auto",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "#0A0A0A";
          e.currentTarget.style.color = "#EAEAEA";
          e.currentTarget.style.borderColor = "#1A1A1A";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#888";
          e.currentTarget.style.borderColor = "transparent";
        }
      }}
      onClick={() => {
        window.location.href = `/chat/${sessionId}`;
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <div>{title}</div>
        <div
          style={{
            fontSize: "11px",
            opacity: 0.7,
            fontFamily: '"Geist Mono", monospace',
          }}
        >
          {formatDate(timestamp)}
        </div>
      </div>
    </button>
  );
}
