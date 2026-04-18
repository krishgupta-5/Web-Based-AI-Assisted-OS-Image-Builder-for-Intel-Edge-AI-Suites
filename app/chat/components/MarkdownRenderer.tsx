"use client";

import React from "react";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (content ?? "").split("\n").map((line, i) => {
    const tLine = line.trim();
    if (tLine.startsWith("# "))
      return (
        <div key={i} style={{ color: "#FFFFFF", fontSize: "17px", fontWeight: 500, marginTop: "24px", marginBottom: "12px", paddingBottom: "10px", borderBottom: "1px solid #333", fontFamily: '"Geist Mono", monospace', letterSpacing: "-0.5px" }}>
          {tLine.substring(2)}
        </div>
      );
    if (tLine.startsWith("## "))
      return (
        <div key={i} style={{ color: "#EAEAEA", fontSize: "13px", fontWeight: 500, marginTop: "18px", marginBottom: "8px", fontFamily: '"Geist Mono", monospace', display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#888" }}>##</span>
          {tLine.substring(3)}
        </div>
      );
    if (tLine.startsWith("### "))
      return (
        <div key={i} style={{ color: "#A0A0A0", fontSize: "10px", fontWeight: 500, marginTop: "14px", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: '"Geist Mono", monospace' }}>
          {tLine.substring(4)}
        </div>
      );
    if (tLine.startsWith("- ")) {
      const inner = tLine.substring(2).replace(/\*\*(.+?)\*\*/g, "<BOLD>$1</BOLD>").replace(/`(.+?)`/g, "<CODE>$1</CODE>");
      return (
        <div key={i} style={{ color: "#CCCCCC", marginLeft: "12px", marginBottom: "6px", display: "flex", alignItems: "flex-start", gap: "10px", lineHeight: "1.6", fontSize: "13px" }}>
          <span style={{ color: "#888", flexShrink: 0, marginTop: "1px" }}>-</span>
          <span dangerouslySetInnerHTML={{ __html: inner.replace(/<BOLD>(.+?)<\/BOLD>/g, '<span style="color:#FFFFFF;font-weight:600;">$1</span>').replace(/<CODE>(.+?)<\/CODE>/g, '<code style="font-size:11px;background:#111;padding:2px 6px;border-radius:4px;color:#A78BFA;border:1px solid #333;font-family:Geist Mono,monospace;">$1</code>') }} />
        </div>
      );
    }
    if (/^\d+\./.test(tLine)) {
      const dotIdx = tLine.indexOf(".");
      return (
        <div key={i} style={{ color: "#CCCCCC", marginLeft: "12px", marginBottom: "6px", display: "flex", gap: "10px", lineHeight: "1.6", fontSize: "13px" }}>
          <span style={{ color: "#A0A0A0", fontFamily: '"Geist Mono", monospace', flexShrink: 0, fontWeight: 500 }}>{tLine.substring(0, dotIdx)}.</span>
          <span>{tLine.substring(dotIdx + 1).trim()}</span>
        </div>
      );
    }
    if (tLine.startsWith("```")) return <div key={i} style={{ height: "4px" }} />;
    if (tLine.includes("`")) {
      const parts = tLine.split(/(`[^`]+`)/g);
      return (
        <div key={i} style={{ color: "#CCCCCC", marginBottom: "6px", lineHeight: "1.65", minHeight: "19px", fontSize: "13px" }}>
          {parts.map((part, j) =>
            part.startsWith("`") && part.endsWith("`") ? (
              <code key={j} style={{ fontSize: "11px", background: "#111", padding: "2px 6px", borderRadius: "4px", color: "#A78BFA", border: "1px solid #333", fontFamily: '"Geist Mono", monospace' }}>
                {part.slice(1, -1)}
              </code>
            ) : (
              <span key={j}>{part}</span>
            )
          )}
        </div>
      );
    }
    return (
      <div key={i} style={{ color: "#CCCCCC", marginBottom: "6px", lineHeight: "1.65", minHeight: "19px", fontSize: "13px" }}>
        {line}
      </div>
    );
  });
}
