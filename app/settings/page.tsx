"use client";

import React, { useState } from "react";
import Link from "next/link";

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
            SM
          </div>
          <div>
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
              Update Avatar
            </button>
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
              JPG, GIF OR PNG. MAX 2MB.
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
          <InputField label="Display Name" defaultValue="Sahil Mishra" />
          <InputField label="Username" defaultValue="@sahilmishra" />
          <div style={{ gridColumn: "1 / -1" }}>
            <InputField
              label="Email Address"
              defaultValue="sahil@edge-os.dev"
              type="email"
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            paddingTop: "8px",
          }}
        >
          <button
            style={{
              background: "transparent",
              border: "1px solid #333",
              color: "#A1A1AA",
              padding: "10px 24px",
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
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function PreferencesSection() {
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
      </div>
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
            border: "1px solid #222",
            borderRadius: "4px",
            overflow: "hidden",
            background: "#050505",
          }}
        >
          <table
            style={{
              width: "100%",
              textAlign: "left",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#0A0A0A",
                  borderBottom: "1px solid #222",
                }}
              >
                <th
                  style={{
                    padding: "16px",
                    fontSize: "10px",
                    color: "#666",
                    fontFamily: '"Geist Mono", monospace',
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    fontWeight: "normal",
                    borderRight: "1px solid #1A1A1A",
                  }}
                >
                  Name
                </th>
                <th
                  style={{
                    padding: "16px",
                    fontSize: "10px",
                    color: "#666",
                    fontFamily: '"Geist Mono", monospace',
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    fontWeight: "normal",
                    borderRight: "1px solid #1A1A1A",
                  }}
                >
                  Token
                </th>
                <th
                  style={{
                    padding: "16px",
                    fontSize: "10px",
                    color: "#666",
                    fontFamily: '"Geist Mono", monospace',
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    fontWeight: "normal",
                    textAlign: "right",
                  }}
                >
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #1A1A1A" }}>
                <td
                  style={{
                    padding: "16px",
                    color: "#EAEAEA",
                    fontSize: "12px",
                    fontFamily: '"Geist Mono", monospace',
                    borderRight: "1px solid #1A1A1A",
                  }}
                >
                  Production Server
                </td>
                <td
                  style={{
                    padding: "16px",
                    color: "#888",
                    fontSize: "12px",
                    fontFamily: '"Geist Mono", monospace',
                    borderRight: "1px solid #1A1A1A",
                  }}
                >
                  edge_live_8f92...a1b2
                </td>
                <td
                  style={{
                    padding: "16px",
                    color: "#666",
                    fontSize: "12px",
                    fontFamily: '"Geist Mono", monospace',
                    textAlign: "right",
                  }}
                >
                  Oct 12, 2025
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    padding: "16px",
                    color: "#EAEAEA",
                    fontSize: "12px",
                    fontFamily: '"Geist Mono", monospace',
                    borderRight: "1px solid #1A1A1A",
                  }}
                >
                  Local CLI
                </td>
                <td
                  style={{
                    padding: "16px",
                    color: "#888",
                    fontSize: "12px",
                    fontFamily: '"Geist Mono", monospace',
                    borderRight: "1px solid #1A1A1A",
                  }}
                >
                  edge_dev_c4d5...e6f7
                </td>
                <td
                  style={{
                    padding: "16px",
                    color: "#666",
                    fontSize: "12px",
                    fontFamily: '"Geist Mono", monospace',
                    textAlign: "right",
                  }}
                >
                  Just now
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BillingSection() {
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
            ARCHITECT PRO
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "#A1A1AA",
              fontFamily: '"Geist Mono", monospace',
              marginBottom: "32px",
            }}
          >
            $49.00 / MONTH
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
              Manage Subscription
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
              24,592
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
              / 500K TOKENS
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
              style={{ height: "100%", background: "#EAEAEA", width: "5%" }}
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
            Resets in 14 days
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
}: {
  label: string;
  defaultValue?: string;
  type?: string;
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
        suppressHydrationWarning={true}
        style={{
          width: "100%",
          background: "#050505",
          border: "1px solid #222",
          color: "#EAEAEA",
          padding: "14px 16px",
          borderRadius: "2px",
          fontSize: "13px",
          fontFamily: '"Geist Mono", monospace',
          outline: "none",
          transition: "border-color 0.2s",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "#555")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "#222")}
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
