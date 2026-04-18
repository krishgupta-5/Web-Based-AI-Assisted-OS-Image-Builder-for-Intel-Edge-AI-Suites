"use client";

import React, { useState } from "react";

interface CopyButtonProps {
  content: string;
}

export default function CopyButton({ content }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const el = document.createElement("textarea");
      el.value = content;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "10px",
        color: copied ? "#34D399" : "#A0A0A0",
        background: "transparent",
        border: `1px solid ${copied ? "#34D39940" : "#333"}`,
        padding: "4px 12px",
        borderRadius: "4px",
        cursor: "pointer",
        fontFamily: '"Geist Mono", monospace',
        transition: "all 0.2s ease",
        fontWeight: 600,
        letterSpacing: "0.5px",
      }}
      onMouseEnter={(e) => {
        if (!copied) {
          e.currentTarget.style.color = "#FFFFFF";
          e.currentTarget.style.borderColor = "#666";
        }
      }}
      onMouseLeave={(e) => {
        if (!copied) {
          e.currentTarget.style.color = "#A0A0A0";
          e.currentTarget.style.borderColor = "#333";
        }
      }}
    >
      {copied ? "COPIED!" : "COPY"}
    </button>
  );
}
