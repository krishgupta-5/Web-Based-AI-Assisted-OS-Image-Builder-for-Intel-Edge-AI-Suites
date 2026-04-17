"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useUser, SignOutButton } from "@clerk/nextjs";

type Tab = "profile" | "preferences" | "api-keys" | "billing";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#000000",
        color: "#EAEAEA",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "100px 24px 60px", // PUSHED DOWN: 100px top padding
        fontFamily: '"Geist", sans-serif',
      }}
    >
      {/* ───────────────────────────────────────────── */}
      {/* PAGE HEADER                                   */}
      {/* ───────────────────────────────────────────── */}
      <div
        style={{
          width: "100%",
          maxWidth: "1024px",
          display: "flex",
          alignItems: "center",
          gap: "20px",
          marginBottom: "48px",
          paddingBottom: "24px",
          borderBottom: "1px solid #1A1A1A",
        }}
      >
        <Link href="/chat" style={{ textDecoration: "none" }}>
          <button
            style={{
              width: "36px",
              height: "36px",
              background: "transparent",
              border: "1px solid #222",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px",
              cursor: "pointer",
              color: "#888",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#EAEAEA";
              e.currentTarget.style.background = "#111";
              e.currentTarget.style.borderColor = "#444";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#888";
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "#222";
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
        </Link>

        <div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#EAEAEA",
              fontFamily: '"Geist Mono", monospace',
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            EDGE-OS{" "}
            <span style={{ color: "#555", fontWeight: 400 }}>// SETTINGS</span>
          </div>
          <p
            style={{
              color: "#888",
              fontSize: "13px",
              marginTop: "6px",
              lineHeight: "1.5",
              margin: "6px 0 0 0",
            }}
          >
            Manage your workspace configuration, identity, and system
            preferences.
          </p>
        </div>
      </div>

      {/* ───────────────────────────────────────────── */}
      {/* MAIN LAYOUT                                   */}
      {/* ───────────────────────────────────────────── */}
      <div
        style={{
          width: "100%",
          maxWidth: "1024px",
          display: "flex",
          flexDirection: "row",
          gap: "64px",
          flexWrap: "wrap",
        }}
      >
        {/* SIDEBAR NAVIGATION */}
        <aside
          style={{
            width: "240px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              color: "#555",
              fontFamily: '"Geist Mono", monospace',
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "12px",
              paddingLeft: "16px",
              fontWeight: 600,
            }}
          >
            Configuration
          </div>
          <NavButton
            active={activeTab === "profile"}
            onClick={() => setActiveTab("profile")}
            label="User Profile"
          />
          <NavButton
            active={activeTab === "preferences"}
            onClick={() => setActiveTab("preferences")}
            label="Preferences"
          />
          <NavButton
            active={activeTab === "api-keys"}
            onClick={() => setActiveTab("api-keys")}
            label="API Keys & Macros"
          />
          <NavButton
            active={activeTab === "billing"}
            onClick={() => setActiveTab("billing")}
            label="Usage & Billing"
          />
        </aside>

        {/* CONTENT AREA */}
        <main style={{ flex: 1, minWidth: "300px" }}>
          {activeTab === "profile" && <ProfileSection />}
          {activeTab === "preferences" && <PreferencesSection />}
          {activeTab === "api-keys" && <ApiKeysSection />}
          {activeTab === "billing" && <BillingSection />}
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SUB-SECTIONS
// ─────────────────────────────────────────────

function ProfileSection() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded || !isSignedIn || !user) {
    return (
      <div style={{ animation: "pipFade 0.2s ease-out forwards" }}>
        <SectionHeader
          title="User Profile"
          description="Loading user profile..."
        />
      </div>
    );
  }

  const initials = (user.firstName?.[0] || "") + (user.lastName?.[0] || "");
  const displayName = user.fullName || "";
  const username = user.username ? `@${user.username}` : "";
  const email = user.primaryEmailAddress?.emailAddress || "";
  const imageUrl = user.imageUrl;

  return (
    <div style={{ animation: "pipFade 0.2s ease-out forwards" }}>
      <SectionHeader
        title="User Profile"
        description="Manage your personal information, display settings, and system identity."
      />

      <div
        style={{
          background: "#000000",
          border: "1px solid #1A1A1A",
          borderRadius: "4px",
          padding: "32px",
          display: "flex",
          flexDirection: "column",
          gap: "32px",
        }}
      >
        {/* Avatar Area */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt="Avatar" 
              style={{
                width: "72px",
                height: "72px",
                border: "1px solid #222",
                borderRadius: "4px",
                objectFit: "cover",
              }} 
            />
          ) : (
            <div
              style={{
                width: "72px",
                height: "72px",
                background: "#050505",
                border: "1px solid #222",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                fontFamily: '"Geist Mono", monospace',
                color: "#666",
              }}
            >
              {initials || "U"}
            </div>
          )}
          
          <div>
            <SignOutButton>
              <button
                style={{
                  background: "transparent",
                  border: "1px solid #333",
                  color: "#A1A1AA",
                  padding: "8px 16px",
                  borderRadius: "2px",
                  fontSize: "11px",
                  fontFamily: '"Geist Mono", monospace',
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#000";
                  e.currentTarget.style.background = "#EAEAEA";
                  e.currentTarget.style.borderColor = "#EAEAEA";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#A1A1AA";
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "#333";
                }}
              >
                Sign Out
              </button>
            </SignOutButton>
            <p
              style={{
                fontSize: "10px",
                color: "#555",
                marginTop: "12px",
                marginBottom: 0,
                fontFamily: '"Geist Mono", monospace',
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              LOG OUT OF YOUR ACCOUNT
            </p>
          </div>
        </div>

        <div style={{ height: "1px", width: "100%", background: "#111" }} />

        {/* Form Fields */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "24px",
          }}
        >
          <InputField label="Display Name" defaultValue={displayName} readOnly />
          <InputField label="Username" defaultValue={username} readOnly />
          <div style={{ gridColumn: "1 / -1" }}>
            <InputField
              label="Email Address"
              defaultValue={email}
              type="email"
              readOnly
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PreferencesSection() {
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleClearHistory = async () => {
    setIsClearing(true);
    try {
      // Clear all sessions for the user
      const response = await fetch('/api/chat-history?clearAll=true', {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        console.log(result.message);
        
        // Clear all local storage chat history
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('chatHistory_')) {
            localStorage.removeItem(key);
          }
        });
        
        // Show success message or redirect
        alert('Chat history cleared successfully!');
        window.location.reload();
      } else {
        console.error('Failed to clear chat history');
        alert('Failed to clear chat history. Please try again.');
      }
    } catch (error) {
      console.error('Error clearing chat history:', error);
      alert('Error clearing chat history. Please try again.');
    } finally {
      setIsClearing(false);
      setShowConfirmDialog(false);
    }
  };

  return (
    <div style={{ animation: "pipFade 0.2s ease-out forwards" }}>
      <SectionHeader
        title="Preferences"
        description="Customize your workspace environment and tooling behaviors."
      />

      <div
        style={{
          background: "#000000",
          border: "1px solid #1A1A1A",
          borderRadius: "4px",
          padding: "32px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <ToggleRow
          title="Terminal Output Mode"
          description="Display raw execution logs instead of formatted text responses."
          defaultChecked={true}
        />
        <div style={{ height: "1px", width: "100%", background: "#111" }} />
        <ToggleRow
          title="Auto-Render Diagrams"
          description="Automatically compile Mermaid/Kroki diagrams when detected in output."
          defaultChecked={true}
        />
        <div style={{ height: "1px", width: "100%", background: "#111" }} />
        <ToggleRow
          title="Strict Focus Mode"
          description="Hide sidebar and extraneous UI elements while generating infrastructure."
          defaultChecked={false}
        />
        <div style={{ height: "1px", width: "100%", background: "#111" }} />
        
        {/* Clear History Section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "24px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "12px",
                color: "#EAEAEA",
                fontFamily: '"Geist Mono", monospace',
                fontWeight: 600,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              DELETE ALL CHATS
            </div>
            <div style={{ fontSize: "13px", color: "#888", lineHeight: "1.6" }}>
              Permanently remove all chat history and conversations. This action cannot be undone.
            </div>
          </div>
          <button
            onClick={() => setShowConfirmDialog(true)}
            disabled={isClearing}
            style={{
              padding: "8px 16px",
              backgroundColor: "transparent",
              color: "#ff0000",
              border: "1px solid #ff0000",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
              textTransform: "uppercase",
              opacity: isClearing ? 0.5 : 1,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (!isClearing) {
                e.currentTarget.style.backgroundColor = "#ff0000";
                e.currentTarget.style.color = "#ffffff";
              }
            }}
            onMouseLeave={(e) => {
              if (!isClearing) {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#ff0000";
              }
            }}
          >
            {isClearing ? "DELETING..." : "DELETE ALL"}
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowConfirmDialog(false)}
        >
          <div
            style={{
              background: "#000",
              border: "1px solid #1A1A1A",
              borderRadius: "4px",
              padding: "32px",
              maxWidth: "400px",
              width: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: "16px",
                color: "#EAEAEA",
                fontFamily: '"Geist", sans-serif',
                fontWeight: 500,
                marginBottom: "16px",
              }}
            >
              Clear All Chat History?
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "#888",
                lineHeight: "1.6",
                marginBottom: "24px",
              }}
            >
              This action cannot be undone. All messages from all your chat sessions will be permanently deleted.
            </div>
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowConfirmDialog(false)}
                style={{
                  background: "transparent",
                  border: "1px solid #333",
                  color: "#A1A1AA",
                  padding: "8px 16px",
                  borderRadius: "2px",
                  fontSize: "10px",
                  fontFamily: '"Geist Mono", monospace',
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#000";
                  e.currentTarget.style.background = "#EAEAEA";
                  e.currentTarget.style.borderColor = "#EAEAEA";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#A1A1AA";
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "#333";
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleClearHistory}
                disabled={isClearing}
                style={{
                  background: isClearing ? "#dc2626" : "#dc2626",
                  border: "1px solid #dc2626",
                  color: "#fff",
                  padding: "8px 16px",
                  borderRadius: "2px",
                  fontSize: "10px",
                  fontFamily: '"Geist Mono", monospace',
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  cursor: isClearing ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  opacity: isClearing ? 0.7 : 1,
                }}
              >
                {isClearing ? "Clearing..." : "Clear History"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ApiKeysSection() {
  return (
    <div style={{ animation: "pipFade 0.2s ease-out forwards" }}>
      <SectionHeader
        title="API Keys"
        description="Manage access tokens for external service integrations."
      />

      <div
        style={{
          background: "#000000",
          border: "1px solid #1A1A1A",
          borderRadius: "4px",
          padding: "32px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontFamily: '"Geist Mono", monospace',
              color: "#A1A1AA",
              textTransform: "uppercase",
              letterSpacing: "1px",
              fontWeight: 600,
            }}
          >
            Active Tokens
          </div>
          <button
            style={{
              background: "transparent",
              border: "1px solid #333",
              color: "#A1A1AA",
              padding: "6px 14px",
              borderRadius: "2px",
              fontSize: "10px",
              fontFamily: '"Geist Mono", monospace',
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#000";
              e.currentTarget.style.background = "#EAEAEA";
              e.currentTarget.style.borderColor = "#EAEAEA";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#A1A1AA";
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "#333";
            }}
          >
            + Generate Key
          </button>
        </div>

        <div
          style={{
            border: "1px dashed #222",
            borderRadius: "4px",
            padding: "48px 24px",
            textAlign: "center",
            background: "transparent",
            color: "#666",
            fontSize: "12px",
            fontFamily: '"Geist Mono", monospace',
          }}
        >
          No active API keys found. Generate one to get started.
        </div>
      </div>
    </div>
  );
}

function BillingSection() {
  const [tokenData, setTokenData] = useState<{
    tokensUsed: number;
    tokensLimit: number;
    resetAt?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/token-quota")
      .then((res) => res.json())
      .then((data) => {
        setTokenData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch token quota:", err);
        setLoading(false);
      });
  }, []);

  const formattedTokensUsed = tokenData ? tokenData.tokensUsed.toLocaleString() : "0";
  const formattedTokensLimit = tokenData 
    ? (tokenData.tokensLimit >= 1000 ? `${tokenData.tokensLimit / 1000}K` : tokenData.tokensLimit.toLocaleString())
    : "0";
  
  let percentage = 0;
  if (tokenData && tokenData.tokensLimit > 0) {
    percentage = Math.min(100, Math.round((tokenData.tokensUsed / tokenData.tokensLimit) * 100));
  }

  let resetMessage = "Usage metrics are currently unavailable";
  if (tokenData?.resetAt) {
    const diffMs = Math.max(0, tokenData.resetAt - Date.now());
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      resetMessage = `Resets in ${days} days`;
    } else {
      resetMessage = `Resets in ${hours}h ${minutes}m`;
    }
  }

  return (
    <div style={{ animation: "pipFade 0.2s ease-out forwards" }}>
      <SectionHeader
        title="Usage & Billing"
        description="Monitor your LLM token consumption and active plan."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "24px",
          marginBottom: "24px",
        }}
      >
        {/* Plan Card */}
        <div
          style={{
            background: "#000000",
            border: "1px solid #1A1A1A",
            borderRadius: "4px",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              color: "#666",
              fontFamily: '"Geist Mono", monospace',
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "12px",
            }}
          >
            Current Plan
          </div>
          <div
            style={{
              fontSize: "24px",
              color: "#EAEAEA",
              fontFamily: '"Geist", sans-serif',
              fontWeight: 500,
              letterSpacing: "-0.5px",
              marginBottom: "8px",
            }}
          >
            FREE TIER
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "#A1A1AA",
              fontFamily: '"Geist Mono", monospace',
              marginBottom: "32px",
            }}
          >
            $0.00 / MONTH
          </div>
          <div style={{ marginTop: "auto" }}>
            <button
              style={{
                width: "100%",
                background: "transparent",
                border: "1px solid #333",
                color: "#A1A1AA",
                padding: "12px 16px",
                borderRadius: "2px",
                fontSize: "11px",
                fontFamily: '"Geist Mono", monospace',
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "1px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#000";
                e.currentTarget.style.background = "#EAEAEA";
                e.currentTarget.style.borderColor = "#EAEAEA";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#A1A1AA";
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "#333";
              }}
            >
              Upgrade Plan
            </button>
          </div>
        </div>

        {/* Usage Card */}
        <div
          style={{
            background: "#000000",
            border: "1px solid #1A1A1A",
            borderRadius: "4px",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              color: "#666",
              fontFamily: '"Geist Mono", monospace',
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "16px",
            }}
          >
            Current Cycle Usage
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: "12px",
            }}
          >
            <span
              style={{
                fontSize: "36px",
                color: "#EAEAEA",
                fontFamily: '"Geist Mono", monospace',
                fontWeight: 500,
                lineHeight: 1,
                letterSpacing: "-1px",
              }}
            >
              {loading ? "..." : formattedTokensUsed}
            </span>
            <span
              style={{
                fontSize: "11px",
                color: "#666",
                fontFamily: '"Geist Mono", monospace',
                letterSpacing: "1px",
                marginBottom: "4px",
              }}
            >
              / {loading ? "..." : `${formattedTokensLimit} TOKENS`}
            </span>
          </div>

          {/* Brutalist Progress Bar */}
          <div
            style={{
              width: "100%",
              height: "2px",
              background: "#111",
              marginTop: "12px",
              overflow: "hidden",
            }}
          >
            <div
              style={{ height: "100%", background: "#EAEAEA", width: `${percentage}%`, transition: 'width 0.5s ease' }}
            />
          </div>

          <div
            style={{
              fontSize: "10px",
              color: "#555",
              marginTop: "16px",
              fontFamily: '"Geist Mono", monospace',
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {loading ? "Loading metrics..." : resetMessage}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SHARED UI COMPONENTS
// ─────────────────────────────────────────────

function NavButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: "14px 16px",
        borderRadius: "2px",
        fontSize: "11px",
        fontFamily: '"Geist Mono", monospace',
        textTransform: "uppercase",
        letterSpacing: "1px",
        fontWeight: 600,
        transition: "all 0.2s ease",
        cursor: "pointer",
        border: "1px solid transparent",
        borderLeft: active ? "2px solid #EAEAEA" : "2px solid transparent",
        background: active ? "#0A0A0A" : "transparent",
        color: active ? "#EAEAEA" : "#666",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.color = "#A1A1AA";
          e.currentTarget.style.background = "#050505";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.color = "#666";
          e.currentTarget.style.background = "transparent";
        }
      }}
    >
      {label}
    </button>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        marginBottom: "40px",
        borderBottom: "1px solid #111",
        paddingBottom: "24px",
      }}
    >
      <h2
        style={{
          fontSize: "24px",
          fontWeight: 500,
          color: "#EAEAEA",
          fontFamily: '"Geist", sans-serif',
          letterSpacing: "-0.5px",
          margin: 0,
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontSize: "14px",
          color: "#888",
          marginTop: "12px",
          lineHeight: "1.6",
          margin: "12px 0 0 0",
        }}
      >
        {description}
      </p>
    </div>
  );
}

function InputField({
  label,
  defaultValue,
  type = "text",
  readOnly = false,
}: {
  label: string;
  defaultValue?: string;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <label
        style={{
          fontSize: "10px",
          color: "#888",
          fontFamily: '"Geist Mono", monospace',
          textTransform: "uppercase",
          letterSpacing: "1px",
          fontWeight: 600,
        }}
      >
        {label}
      </label>
      <input
        type={type}
        defaultValue={defaultValue}
        readOnly={readOnly}
        suppressHydrationWarning={true}
        style={{
          width: "100%",
          background: readOnly ? "#000" : "#050505",
          border: "1px solid #222",
          color: readOnly ? "#888" : "#EAEAEA",
          padding: "14px 16px",
          borderRadius: "2px",
          fontSize: "13px",
          fontFamily: '"Geist Mono", monospace',
          outline: "none",
          transition: "border-color 0.2s",
          cursor: readOnly ? "not-allowed" : "text",
        }}
        onFocus={(e) => !readOnly && (e.currentTarget.style.borderColor = "#555")}
        onBlur={(e) => !readOnly && (e.currentTarget.style.borderColor = "#222")}
      />
    </div>
  );
}

function ToggleRow({
  title,
  description,
  defaultChecked,
}: {
  title: string;
  description: string;
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked || false);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "24px",
      }}
    >
      <div>
        <div
          style={{
            fontSize: "12px",
            color: "#EAEAEA",
            fontFamily: '"Geist Mono", monospace',
            fontWeight: 600,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: "13px", color: "#888", lineHeight: "1.6" }}>
          {description}
        </div>
      </div>
      <button
        onClick={() => setChecked(!checked)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px 16px",
          borderRadius: "2px",
          border: "1px solid",
          fontSize: "10px",
          fontFamily: '"Geist Mono", monospace',
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "1px",
          cursor: "pointer",
          transition: "all 0.2s ease",
          flexShrink: 0,
          background: checked ? "#EAEAEA" : "#000",
          color: checked ? "#000" : "#666",
          borderColor: checked ? "#EAEAEA" : "#333",
        }}
        onMouseEnter={(e) => {
          if (!checked) e.currentTarget.style.borderColor = "#555";
        }}
        onMouseLeave={(e) => {
          if (!checked) e.currentTarget.style.borderColor = "#333";
        }}
      >
        {checked ? "ENABLED" : "DISABLED"}
      </button>
    </div>
  );
}
