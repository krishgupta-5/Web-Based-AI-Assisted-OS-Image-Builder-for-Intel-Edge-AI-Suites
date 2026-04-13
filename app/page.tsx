"use client";

import React from "react";
import Link from "next/link";
import { Terminal, Box, Cloud } from "lucide-react";

export default function LaunchingSoonPage() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#000000",
        minHeight: "100vh",
        overflow: "hidden",
        position: "relative",
        fontFamily: '"Geist", sans-serif',
      }}
    >
      {/* ───────────────────────────────────────────── */}
      {/* HEADER (Matching Chat Panel Header)           */}
      {/* ───────────────────────────────────────────── */}
      <div
        style={{
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          zIndex: 10,
          borderBottom: "1px solid #111",
        }}
      >
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "#EAEAEA",
              letterSpacing: "1px",
              fontFamily: '"Geist Mono", monospace',
            }}
          >
            EDGE-OS <span style={{ color: "#666", fontWeight: 400 }}>// CORE</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 10px",
              background: "#111",
              border: "1px solid #333",
              borderRadius: "4px",
              fontFamily: '"Geist Mono", monospace',
              fontSize: "10px",
              color: "#FBBF24",
              cursor: "default",
              letterSpacing: "0.5px",
            }}
          >
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#FBBF24",
                animation: "blink 1s step-end infinite",
              }}
            />
            <span>PRE-RELEASE</span>
          </div>
          <Link href="/login" style={{ textDecoration: "none" }}>
            <button
              style={{
                background: "transparent",
                border: "none",
                color: "#A1A1AA",
                cursor: "pointer",
                fontSize: "11px",
                fontFamily: '"Geist Mono", monospace',
                padding: "4px 8px",
                borderRadius: "2px",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#EAEAEA")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#A1A1AA")}
            >
              [ LOGIN ]
            </button>
          </Link>
        </div>
      </div>

      {/* ───────────────────────────────────────────── */}
      {/* MAIN CONTENT (Matching Chat Panel Empty State)*/}
      {/* ───────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          position: "relative",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "60px 20px",
            maxWidth: "900px",
            margin: "0 auto",
            width: "100%",
          }}
        >
          {/* HERO SECTION */}
          <div style={{ marginBottom: "80px" }}>
            <div
              style={{
                color: "#A1A1AA",
                fontSize: "11px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: '"Geist Mono", monospace',
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              Status: <span style={{ color: "#FBBF24" }}>AWAITING LAUNCH PROTOCOL</span>
            </div>
            <h1
              style={{
                fontSize: "36px",
                fontWeight: 500,
                color: "#FFFFFF",
                letterSpacing: "-1px",
                margin: "0 0 16px 0",
              }}
            >
              Launching Soon.
            </h1>
            <p
              style={{
                color: "#A1A1AA",
                fontSize: "15px",
                marginTop: "16px",
                maxWidth: "640px",
                lineHeight: "1.6",
                margin: 0,
              }}
            >
              EDGE-OS is currently undergoing final kernel stability tests. We are
              building a unified, AI-native environment that consolidates
              architecture design, code generation, and cloud deployment into a
              single, seamless terminal experience.
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "32px", flexWrap: "wrap" }}>
              <a
                href="https://forms.google.com/your-link-here"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                <button
                  style={{
                    background: "#EAEAEA",
                    color: "#000",
                    border: "1px solid #EAEAEA",
                    padding: "10px 20px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontFamily: '"Geist Mono", monospace',
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#EAEAEA";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#EAEAEA";
                    e.currentTarget.style.color = "#000";
                  }}
                >
                  Join Waitlist &rarr;
                </button>
              </a>
              <span
                style={{
                  fontSize: "12px",
                  color: "#666",
                  fontFamily: '"Geist Mono", monospace',
                }}
              >
                // Get notified upon release
              </span>
            </div>
          </div>

          {/* FEATURES GRID (Matching Macro Grid) */}
          <div
            style={{
              fontSize: "11px",
              color: "#888",
              fontWeight: 600,
              letterSpacing: "1px",
              marginBottom: "16px",
              textTransform: "uppercase",
              fontFamily: '"Geist Mono", monospace',
            }}
          >
            SYSTEM CAPABILITIES
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1px",
              background: "#222",
              border: "1px solid #222",
              borderRadius: "6px",
              overflow: "hidden",
            }}
          >
            {/* Feature 1 */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "32px 24px",
                background: "#050505",
                border: "none",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#0A0A0A")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#050505")}
            >
              <Box size={20} color="#888" style={{ marginBottom: "16px" }} />
              <div
                style={{
                  color: "#EAEAEA",
                  fontSize: "12px",
                  fontWeight: 600,
                  marginBottom: "8px",
                  fontFamily: '"Geist Mono", monospace',
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Architecture Synthesis
              </div>
              <div style={{ color: "#A1A1AA", fontSize: "13px", lineHeight: "1.6" }}>
                Stop wrestling with disconnected tools. Define your system
                architecture, database schemas, and API routes visually or via
                natural language.
              </div>
            </div>

            {/* Feature 2 */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "32px 24px",
                background: "#050505",
                border: "none",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#0A0A0A")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#050505")}
            >
              <Terminal size={20} color="#888" style={{ marginBottom: "16px" }} />
              <div
                style={{
                  color: "#EAEAEA",
                  fontSize: "12px",
                  fontWeight: 600,
                  marginBottom: "8px",
                  fontFamily: '"Geist Mono", monospace',
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Automated Scaffolding
              </div>
              <div style={{ color: "#A1A1AA", fontSize: "13px", lineHeight: "1.6" }}>
                Instantly translate your structural designs into
                production-ready, highly-opinionated codebase repositories.
              </div>
            </div>

            {/* Feature 3 */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "32px 24px",
                background: "#050505",
                border: "none",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#0A0A0A")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#050505")}
            >
              <Cloud size={20} color="#888" style={{ marginBottom: "16px" }} />
              <div
                style={{
                  color: "#EAEAEA",
                  fontSize: "12px",
                  fontWeight: 600,
                  marginBottom: "8px",
                  fontFamily: '"Geist Mono", monospace',
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Zero-Friction Deploy
              </div>
              <div style={{ color: "#A1A1AA", fontSize: "13px", lineHeight: "1.6" }}>
                Bind APIs, provision databases, and generate Docker Compose
                configs automatically. Push your entire stack to the cloud.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────── */}
      {/* FOOTER                                        */}
      {/* ───────────────────────────────────────────── */}
      <div
        style={{
          padding: "24px",
          display: "flex",
          justifyContent: "center",
          gap: "24px",
          color: "#444",
          fontSize: "11px",
          fontFamily: '"Geist Mono", monospace',
          textTransform: "uppercase",
          letterSpacing: "1px",
          borderTop: "1px solid #111",
          background: "#000",
        }}
      >
        <a
          href="#"
          style={{ color: "inherit", textDecoration: "none", transition: "color 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#EAEAEA")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
        >
          Terms of Service
        </a>
        <span>&bull;</span>
        <a
          href="#"
          style={{ color: "inherit", textDecoration: "none", transition: "color 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#EAEAEA")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
        >
          Privacy Policy
        </a>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `,
        }}
      />
    </div>
  );
}