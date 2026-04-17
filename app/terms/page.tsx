"use client";

import React from "react";
import Link from "next/link";

export default function TermsOfService() {
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
          flexShrink: 0,
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
              Terms of Service
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
          flexShrink: 0,
        }}
      >
        <div>
          <h2 style={{ fontSize: "14px", fontFamily: '"Geist Mono", monospace', textTransform: "uppercase", letterSpacing: "1px", color: "#EAEAEA", marginBottom: "16px", fontWeight: 600 }}>
            1. Acceptance of Terms
          </h2>
          <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
            By accessing and using EdgeOS ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: "14px", fontFamily: '"Geist Mono", monospace', textTransform: "uppercase", letterSpacing: "1px", color: "#EAEAEA", marginBottom: "16px", fontWeight: 600 }}>
            2. Description of Service
          </h2>
          <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
            EdgeOS is a developer platform that provides AI-powered coding assistance, project management tools, and collaborative workspace features. The service is offered on a subscription basis with different tiers available.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: "14px", fontFamily: '"Geist Mono", monospace', textTransform: "uppercase", letterSpacing: "1px", color: "#EAEAEA", marginBottom: "16px", fontWeight: 600 }}>
            3. User Accounts and Responsibilities
          </h2>
          <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
            You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. You are solely responsible for all activities that occur under your account.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: "14px", fontFamily: '"Geist Mono", monospace', textTransform: "uppercase", letterSpacing: "1px", color: "#EAEAEA", marginBottom: "16px", fontWeight: 600 }}>
            4. Payment and Subscription Terms
          </h2>
          <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
            Subscription fees are charged in advance on a monthly or annual basis. All fees are non-refundable except as required by law. We reserve the right to change our subscription fees at any time with 30 days notice.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: "14px", fontFamily: '"Geist Mono", monospace', textTransform: "uppercase", letterSpacing: "1px", color: "#EAEAEA", marginBottom: "16px", fontWeight: 600 }}>
            5. Intellectual Property Rights
          </h2>
          <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
            You retain ownership of all intellectual property rights in the code and content you create using our service. We retain ownership of all rights to the EdgeOS platform, software, and proprietary technology.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: "14px", fontFamily: '"Geist Mono", monospace', textTransform: "uppercase", letterSpacing: "1px", color: "#EAEAEA", marginBottom: "16px", fontWeight: 600 }}>
            6. Prohibited Uses
          </h2>
          <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
            You may not use our service for any illegal or unauthorized purpose. You may not use our service to develop malicious software, violate intellectual property rights, or engage in activities that harm others or our platform.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: "14px", fontFamily: '"Geist Mono", monospace', textTransform: "uppercase", letterSpacing: "1px", color: "#EAEAEA", marginBottom: "16px", fontWeight: 600 }}>
            7. Service Availability and Support
          </h2>
          <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
            We strive to maintain high service availability but do not guarantee uninterrupted access. Support levels vary by subscription tier as described in our pricing page.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: "14px", fontFamily: '"Geist Mono", monospace', textTransform: "uppercase", letterSpacing: "1px", color: "#EAEAEA", marginBottom: "16px", fontWeight: 600 }}>
            8. Limitation of Liability
          </h2>
          <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
            To the maximum extent permitted by law, EdgeOS shall not be liable for any indirect, incidental, special, or consequential damages resulting from your use of the service.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: "14px", fontFamily: '"Geist Mono", monospace', textTransform: "uppercase", letterSpacing: "1px", color: "#EAEAEA", marginBottom: "16px", fontWeight: 600 }}>
            9. Termination
          </h2>
          <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
            We may terminate or suspend your account at any time for violation of these terms. You may cancel your subscription at any time through your account settings.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: "14px", fontFamily: '"Geist Mono", monospace', textTransform: "uppercase", letterSpacing: "1px", color: "#EAEAEA", marginBottom: "16px", fontWeight: 600 }}>
            10. Changes to Terms
          </h2>
          <p style={{ color: "#A1A1AA", fontSize: "15px", margin: 0 }}>
            We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Your continued use of the service constitutes acceptance of any modified terms.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: "14px", fontFamily: '"Geist Mono", monospace', textTransform: "uppercase", letterSpacing: "1px", color: "#EAEAEA", marginBottom: "16px", fontWeight: 600 }}>
            11. Contact Information
          </h2>
          <p style={{ color: "#A1A1AA", fontSize: "15px", marginBottom: "16px" }}>
            If you have any questions about these Terms of Service, please contact us at:
          </p>
          <p style={{ color: "#EAEAEA", fontSize: "15px", margin: 0, fontFamily: '"Geist Mono", monospace' }}>
            Email: legal@edgeos.com
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
          flexShrink: 0,
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