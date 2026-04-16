"use client";

// FIX 17: This is the single canonical pricing page.
// The previous codebase had three identical copies (documents 7, 8, 9).
// Delete the other two and keep only app/pricing/page.tsx.

import React, { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#000000", color: "#EAEAEA", display: "flex", flexDirection: "column", alignItems: "center", padding: "100px 24px 60px", fontFamily: '"Geist",sans-serif' }}>
      <div style={{ width: "100%", maxWidth: "1024px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "64px", paddingBottom: "24px", borderBottom: "1px solid #1A1A1A", flexWrap: "wrap", gap: "24px" }}>
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <Link href="/chat" style={{ textDecoration: "none" }}>
            <button style={{ width: "36px", height: "36px", background: "transparent", border: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "4px", cursor: "pointer", color: "#888", transition: "all 0.2s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#EAEAEA"; e.currentTarget.style.background = "#111"; e.currentTarget.style.borderColor = "#444"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#888"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#222"; }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
          </Link>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#EAEAEA", fontFamily: '"Geist Mono",monospace', letterSpacing: "1px", textTransform: "uppercase" }}>
              EDGE-OS <span style={{ color: "#555", fontWeight: 400 }}>// PRICING</span>
            </div>
            <p style={{ color: "#A1A1AA", fontSize: "13px", marginTop: "6px", marginBottom: 0, lineHeight: "1.5" }}>
              Transparent pricing for developers and engineering teams.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "#050505", padding: "4px", borderRadius: "4px", border: "1px solid #1A1A1A" }}>
          <button onClick={() => setIsAnnual(false)} style={{ padding: "8px 16px", background: !isAnnual ? "#1A1A1A" : "transparent", color: !isAnnual ? "#EAEAEA" : "#666", border: "1px solid", borderColor: !isAnnual ? "#333" : "transparent", borderRadius: "2px", fontSize: "11px", fontFamily: '"Geist Mono",monospace', fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", cursor: "pointer", transition: "all 0.2s ease" }}>Monthly</button>
          <button onClick={() => setIsAnnual(true)} style={{ padding: "8px 16px", background: isAnnual ? "#1A1A1A" : "transparent", color: isAnnual ? "#EAEAEA" : "#666", border: "1px solid", borderColor: isAnnual ? "#333" : "transparent", borderRadius: "2px", fontSize: "11px", fontFamily: '"Geist Mono",monospace', fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", cursor: "pointer", transition: "all 0.2s ease", display: "flex", alignItems: "center", gap: "8px" }}>
            Annually <span style={{ color: "#10B981", fontSize: "10px", fontWeight: 700 }}>[ -20% ]</span>
          </button>
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: "1024px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", alignItems: "stretch" }}>
        <PricingCard title="HOBBYIST" description="For individuals exploring the platform." price="0" interval="FOREVER"
          features={["10,000 Tokens / Month", "Standard Execution Speed", "1 Project Workspace", "Community Support"]}
          buttonText="Get Started" buttonVariant="secondary" />
        <PricingCard title="ARCHITECT PRO" description="For professional developers and small teams."
          price={isAnnual ? "39" : "49"} interval="PER MONTH" isHighlighted
          features={["500,000 Tokens / Month", "Fast Execution Speed", "10 Project Workspaces", "Custom Integrations", "Priority Support"]}
          buttonText="Upgrade to Pro" buttonVariant="primary" />
        <PricingCard title="ENTERPRISE" description="For large organizations with custom needs." price="CUSTOM" interval="CONTACT SALES"
          features={["Unlimited Tokens", "Maximum Execution Speed", "Unlimited Workspaces", "On-Premise Deployment", "Dedicated Account Manager"]}
          buttonText="Contact Sales" buttonVariant="secondary" />
      </div>

      <div style={{ marginTop: "64px", display: "flex", gap: "24px", color: "#444", fontSize: "11px", fontFamily: '"Geist Mono",monospace', textTransform: "uppercase", letterSpacing: "1px" }}>
        <a href="#" style={{ color: "inherit", textDecoration: "none", transition: "color 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#EAEAEA")} onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}>Terms of Service</a>
        <span>&bull;</span>
        <a href="#" style={{ color: "inherit", textDecoration: "none", transition: "color 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#EAEAEA")} onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}>Privacy Policy</a>
      </div>
    </div>
  );
}

interface PricingCardProps {
  title: string; description: string; price: string; interval: string;
  features: string[]; buttonText: string; buttonVariant: "primary" | "secondary"; isHighlighted?: boolean;
}

function PricingCard({ title, description, price, interval, features, buttonText, buttonVariant, isHighlighted = false }: PricingCardProps) {
  return (
    <div style={{ background: isHighlighted ? "#0A0A0A" : "#000000", border: "1px solid", borderColor: isHighlighted ? "#222" : "#1A1A1A", borderTop: isHighlighted ? "2px solid #EAEAEA" : "1px solid #1A1A1A", borderRadius: "4px", padding: "40px 32px", display: "flex", flexDirection: "column", transition: "all 0.2s ease", position: "relative" }}
      onMouseEnter={(e) => { if (!isHighlighted) { e.currentTarget.style.background = "#050505"; e.currentTarget.style.borderColor = "#222"; } }}
      onMouseLeave={(e) => { if (!isHighlighted) { e.currentTarget.style.background = "#000000"; e.currentTarget.style.borderColor = "#1A1A1A"; } }}>
      <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "13px", color: isHighlighted ? "#EAEAEA" : "#888", fontFamily: '"Geist Mono",monospace', fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px" }}>{title}</div>
          <p style={{ color: "#A1A1AA", fontSize: "14px", lineHeight: "1.6", margin: 0, minHeight: "44px" }}>{description}</p>
        </div>
        {isHighlighted && <div style={{ background: "#EAEAEA", color: "#000", padding: "4px 8px", fontSize: "9px", fontFamily: '"Geist Mono",monospace', fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", borderRadius: "2px" }}>Recommended</div>}
      </div>
      <div style={{ marginBottom: "32px", display: "flex", alignItems: "baseline", gap: "10px" }}>
        {price !== "CUSTOM" && <span style={{ fontSize: "24px", color: "#888", fontFamily: '"Geist Mono",monospace', fontWeight: 500 }}>$</span>}
        <span style={{ fontSize: price === "CUSTOM" ? "36px" : "48px", color: "#EAEAEA", fontFamily: '"Geist Mono",monospace', fontWeight: 600, letterSpacing: "-1px", lineHeight: 1 }}>{price}</span>
        <span style={{ fontSize: "11px", color: "#666", fontFamily: '"Geist Mono",monospace', textTransform: "uppercase", letterSpacing: "1px" }}>{price !== "CUSTOM" ? `/ ${interval}` : interval}</span>
      </div>
      <button style={{ width: "100%", padding: "16px", background: buttonVariant === "primary" ? "#EAEAEA" : "transparent", color: buttonVariant === "primary" ? "#000" : "#EAEAEA", border: "1px solid", borderColor: buttonVariant === "primary" ? "#EAEAEA" : "#333", borderRadius: "2px", fontSize: "12px", fontFamily: '"Geist Mono",monospace', fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", cursor: "pointer", transition: "all 0.2s ease", marginBottom: "40px" }}
        onMouseEnter={(e) => { if (buttonVariant === "primary") { e.currentTarget.style.background = "#FFFFFF"; e.currentTarget.style.borderColor = "#FFFFFF"; } else { e.currentTarget.style.background = "#111"; e.currentTarget.style.borderColor = "#555"; } }}
        onMouseLeave={(e) => { if (buttonVariant === "primary") { e.currentTarget.style.background = "#EAEAEA"; e.currentTarget.style.borderColor = "#EAEAEA"; } else { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#333"; } }}>
        {buttonText}
      </button>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
        <div style={{ fontSize: "10px", color: "#666", fontFamily: '"Geist Mono",monospace', textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Included Features</div>
        {features.map((feature, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <Check size={16} color={isHighlighted ? "#A1A1AA" : "#555"} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span style={{ color: "#A1A1AA", fontSize: "14px", lineHeight: "1.5" }}>{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
}