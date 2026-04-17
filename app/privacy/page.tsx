"use client";

import React from "react";
import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <div
      style={{
        height: "100vh", // Fixed: Restricts height to viewport
        overflowY: "auto", // Fixed: Forces this container to handle scrolling
        backgroundColor: "#000000",
        color: "#EAEAEA",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "100px 24px 60px",
        fontFamily: '"Geist", sans-serif',
      }}
    >
      {/* ───────────────────────────────────────────── */}
      {/* PAGE HEADER                                   */}
      {/* ───────────────────────────────────────────── */}
      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: "64px",
          paddingBottom: "24px",
          borderBottom: "1px solid #1A1A1A",
          flexWrap: "wrap",
          gap: "24px",
          flexShrink: 0, // Prevents header from squishing
        }}
      >
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <Link href="/pricing" style={{ textDecoration: "none" }}>
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              Privacy Policy
            </div>
            <p
              style={{
                color: "#A1A1AA",
                fontSize: "13px",
                marginTop: "6px",
                marginBottom: 0,
                lineHeight: "1.5",
              }}
            >
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────── */}
      {/* CONTENT                                       */}
      {/* ───────────────────────────────────────────── */}
      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          lineHeight: "1.8",
          display: "flex",
          flexDirection: "column",
          gap: "48px",
          flexShrink: 0, // Prevents content from squishing
        }}
      >
        <div>
          <h2 style={{ fontSize: "14px", fontFamily: '"Geist Mono", monospace', textTransform: "uppercase", letterSpacing: "1px", color: "#EAEAEA", marginBottom: "16px", fontWeight: 600 }}>
            1. Introduction
          </h2>
          <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
            EdgeOS ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our developer platform and services.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: "14px", fontFamily: '"Geist Mono", monospace', textTransform: "uppercase", letterSpacing: "1px", color: "#EAEAEA", marginBottom: "16px", fontWeight: 600 }}>
            2. Information We Collect
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
              <strong style={{ color: "#EAEAEA" }}>Account Information:</strong> When you create an account, we collect your email address, name, and other information you provide during registration.
            </p>
            <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
              <strong style={{ color: "#EAEAEA" }}>Usage Data:</strong> We collect information about how you use our service, including features accessed, time spent, and interactions with our AI assistants.
            </p>
            <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
              <strong style={{ color: "#EAEAEA" }}>Code and Projects:</strong> We store code and project data you create or upload to our platform to provide our services.
            </p>
            <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
              <strong style={{ color: "#EAEAEA" }}>Technical Data:</strong> We collect device information, IP address, browser type, and other technical data to ensure service performance and security.
            </p>
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: "14px", fontFamily: '"Geist Mono", monospace', textTransform: "uppercase", letterSpacing: "1px", color: "#EAEAEA", marginBottom: "16px", fontWeight: 600 }}>
            3. How We Use Your Information
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
              <strong style={{ color: "#EAEAEA" }}>Service Provision:</strong> To provide, maintain, and improve our developer platform and AI services.
            </p>
            <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
              <strong style={{ color: "#EAEAEA" }}>Communication:</strong> To respond to your inquiries, provide support, and send service-related notifications.
            </p>
            <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
              <strong style={{ color: "#EAEAEA" }}>Security:</strong> To detect and prevent fraud, abuse, and security issues.
            </p>
            <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
              <strong style={{ color: "#EAEAEA" }}>Analytics:</strong> To analyze usage patterns and improve our services and user experience.
            </p>
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: "14px", fontFamily: '"Geist Mono", monospace', textTransform: "uppercase", letterSpacing: "1px", color: "#EAEAEA", marginBottom: "16px", fontWeight: 600 }}>
            4. Information Sharing and Disclosure
          </h2>
          <p style={{ color: "#A1A1AA", fontSize: "15px", marginBottom: "16px" }}>
            We do not sell, trade, or otherwise transfer your personal information to third parties except as described in this policy:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
              <strong style={{ color: "#EAEAEA" }}>Service Providers:</strong> We may share information with trusted third-party service providers who assist us in operating our service.
            </p>
            <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
              <strong style={{ color: "#EAEAEA" }}>Legal Requirements:</strong> We may disclose your information if required by law or to protect our rights, property, or safety.
            </p>
            <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
              <strong style={{ color: "#EAEAEA" }}>Business Transfers:</strong> Information may be transferred in connection with a merger, acquisition, or sale of assets.
            </p>
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: "14px", fontFamily: '"Geist Mono", monospace', textTransform: "uppercase", letterSpacing: "1px", color: "#EAEAEA", marginBottom: "16px", fontWeight: 600 }}>
            5. Data Security
          </h2>
          <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
            We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes encryption, secure servers, and regular security audits.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: "14px", fontFamily: '"Geist Mono", monospace', textTransform: "uppercase", letterSpacing: "1px", color: "#EAEAEA", marginBottom: "16px", fontWeight: 600 }}>
            6. Data Retention
          </h2>
          <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
            We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this policy, unless a longer retention period is required or permitted by law.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: "14px", fontFamily: '"Geist Mono", monospace', textTransform: "uppercase", letterSpacing: "1px", color: "#EAEAEA", marginBottom: "16px", fontWeight: 600 }}>
            7. Your Rights and Choices
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
              <strong style={{ color: "#EAEAEA" }}>Access:</strong> You can access and update your account information through your account settings.
            </p>
            <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
              <strong style={{ color: "#EAEAEA" }}>Deletion:</strong> You can request deletion of your account and associated data by contacting us or using account deletion features.
            </p>
            <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
              <strong style={{ color: "#EAEAEA" }}>Opt-out:</strong> You can opt out of certain communications and data processing activities through your account settings.
            </p>
            <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
              <strong style={{ color: "#EAEAEA" }}>Data Portability:</strong> You can request a copy of your personal data in a structured, machine-readable format.
            </p>
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: "14px", fontFamily: '"Geist Mono", monospace', textTransform: "uppercase", letterSpacing: "1px", color: "#EAEAEA", marginBottom: "16px", fontWeight: 600 }}>
            8. Contact Information
          </h2>
          <p style={{ color: "#A1A1AA", fontSize: "15px", marginBottom: "16px" }}>
            If you have any questions about this Privacy Policy or your data rights, please contact us at:
          </p>
          <p style={{ color: "#EAEAEA", fontSize: "15px", margin: 0, fontFamily: '"Geist Mono", monospace' }}>
            Email: privacy@edgeos.com<br />
            Address: Privacy Team, EdgeOS Inc.
          </p>
        </div>
      </div>

      {/* ───────────────────────────────────────────── */}
      {/* CUSTOM FIXED FOOTER                           */}
      {/* ───────────────────────────────────────────── */}
      <div
        style={{
          marginTop: "auto",
          paddingTop: "80px",
          display: "flex",
          gap: "24px",
          color: "#444",
          fontSize: "11px",
          fontFamily: '"Geist Mono", monospace',
          textTransform: "uppercase",
          letterSpacing: "1px",
          flexShrink: 0, // Keeps footer from getting crushed
        }}
      >
        <Link
          href="/terms"
          style={{ color: "inherit", textDecoration: "none", transition: "color 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#EAEAEA")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
        >
          Terms of Service
        </Link>
        <span>&bull;</span>
        <Link
          href="/privacy"
          style={{ color: "inherit", textDecoration: "none", transition: "color 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#EAEAEA")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
        >
          Privacy Policy
        </Link>
      </div>
    </div>
  );
}