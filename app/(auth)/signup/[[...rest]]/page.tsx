"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

// Structural, non-glowing network pattern (Matches Login)
const StructuralNetwork = () => (
  <svg
    className="absolute inset-0 w-full h-full pointer-events-none z-0"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1000 1000"
    preserveAspectRatio="xMidYMid slice"
  >
    <g stroke="#333333" strokeWidth="1" strokeDasharray="2 4" opacity="0.6">
      <line x1="100" y1="100" x2="300" y2="400" />
      <line x1="300" y1="400" x2="600" y2="200" />
      <line x1="600" y1="200" x2="900" y2="500" />
      <line x1="900" y1="500" x2="700" y2="800" />
      <line x1="700" y1="800" x2="400" y2="900" />
      <line x1="400" y1="900" x2="300" y2="400" />
      <line x1="600" y1="200" x2="700" y2="800" />
      <line x1="100" y1="100" x2="900" y2="500" />
      <line x1="0" y1="500" x2="300" y2="400" />
      <line x1="1000" y1="200" x2="600" y2="200" />
    </g>

    <g fill="#000000" stroke="#555555" strokeWidth="1.5">
      <rect x="95" y="95" width="10" height="10" />
      <rect x="295" y="395" width="10" height="10" />
      <rect x="595" y="195" width="10" height="10" />
      <rect x="895" y="495" width="10" height="10" />
      <rect x="695" y="795" width="10" height="10" />
      <rect x="395" y="895" width="10" height="10" />
    </g>

    <g fill="#EAEAEA">
      <circle cx="300" cy="400" r="2" />
      <circle cx="600" cy="200" r="2" />
      <circle cx="900" cy="500" r="2" />
    </g>
  </svg>
);

export default function SignUpPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      <StructuralNetwork />

      <div 
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at center, #000000 30%, transparent 100%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* ───────────────────────────────────────────── */}
      {/* HEADER                                        */}
      {/* ───────────────────────────────────────────── */}
      <div
        style={{
          padding: "32px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontSize: "11px",
            color: "#666",
            letterSpacing: "2px",
            fontFamily: '"Geist Mono", monospace',
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {/* Path updated for signup */}
          <span style={{ color: "#444" }}>[SYS]</span> ~/edge-os/auth/register
        </div>
        
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* Link points back to login now */}
          <Link href="/login" style={{ textDecoration: "none" }}>
            <span
              style={{
                color: "#666",
                fontSize: "11px",
                fontFamily: '"Geist Mono", monospace',
                letterSpacing: "1px",
                textTransform: "uppercase",
                transition: "color 0.2s ease",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#EAEAEA";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#666";
              }}
            >
              [ AUTHENTICATE ]
            </span>
          </Link>
        </div>
      </div>

      {/* ───────────────────────────────────────────── */}
      {/* MAIN CONTENT                                  */}
      {/* ───────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          marginTop: "-40px", 
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", zIndex: 10 }}>
          
          {/* STATUS INDICATOR */}
          {mounted && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "6px 14px",
                background: "#080808",
                border: "1px solid #222",
                borderRadius: "4px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
              }}
            >
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "8px", height: "8px" }}>
                {/* Outer Pulse */}
                <span 
                  style={{ 
                    position: "absolute", 
                    width: "100%", 
                    height: "100%", 
                    background: "#FBBF24", 
                    borderRadius: "50%", 
                    animation: "pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite",
                    opacity: 0.8
                  }} 
                />
                {/* Inner Solid Dot */}
                <span 
                  style={{ 
                    position: "relative",
                    width: "6px", 
                    height: "6px", 
                    background: "#FBBF24", 
                    borderRadius: "50%",
                    zIndex: 2
                  }} 
                />
              </div>
              <span
                style={{
                  color: "#EAEAEA",
                  fontSize: "11px",
                  fontFamily: '"Geist Mono", monospace',
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                  fontWeight: 500,
                }}
              >
                Awaiting Registration
              </span>
            </div>
          )}
          
          <SignUp routing="path" path="/signup" signInUrl="/login" />
        </div>
      </div>

      {/* ───────────────────────────────────────────── */}
      {/* FOOTER                                        */}
      {/* ───────────────────────────────────────────── */}
      <div
        style={{
          padding: "24px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "#444",
          fontSize: "10px",
          fontFamily: '"Geist Mono", monospace',
          textTransform: "uppercase",
          letterSpacing: "1px",
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          pointerEvents: "none",
        }}
      >
        <div style={{ display: "flex", gap: "16px" }}>
          <span>CONNECTION: SECURE</span>
          <span style={{ color: "#333" }}>|</span>
          <span>LATENCY: 12ms</span>
        </div>
        
        <div>
          v1.0.0
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `,
        }}
      />
    </div>
  );
}