"use client";

import React from "react";

interface TestingPlanViewerProps {
  content: string;
}

export default function TestingPlanViewer({ content }: TestingPlanViewerProps) {
  const sectionColors: Record<string, string> = {
    unit: "#34D399",
    integration: "#60A5FA",
    e2e: "#A78BFA",
    ci: "#FBBF24",
  };

  // Extract simple sections by scanning lines
  const lines = content.split("\n");
  const sections: Array<{ key: string; items: string[] }> = [];
  let currentSection = "";
  let currentItems: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^(unit|integration|e2e|ci):/.test(trimmed)) {
      if (currentSection) sections.push({ key: currentSection, items: currentItems });
      currentSection = trimmed.replace(":", "");
      currentItems = [];
    } else if (currentSection && trimmed.startsWith("-")) {
      currentItems.push(trimmed.replace(/^-\s*/, "").replace(/^focus:\s*/, "").replace(/^scenarios:\s*/, ""));
    } else if (currentSection && trimmed && !trimmed.includes(":")) {
      // inline values like framework, coverage_target
      currentItems.push(trimmed);
    }
  }
  if (currentSection) sections.push({ key: currentSection, items: currentItems });

  // Extract top-level fields: strategy, coverage_target
  const strategy = lines.find(l => l.trim().startsWith("strategy:"))?.split(":")[1]?.trim() ?? "";
  const coverage = lines.find(l => l.trim().startsWith("coverage_target:"))?.split(":")[1]?.trim() ?? "";

  const sectionLabels: Record<string, string> = {
    unit: "Unit Tests",
    integration: "Integration Tests",
    e2e: "End-to-End Tests",
    ci: "CI Configuration",
  };

  if (sections.length === 0) {
    return (
      <pre style={{ margin: 0, fontSize: "12px", fontFamily: '"Geist Mono", monospace', lineHeight: "1.65", whiteSpace: "pre", color: "#CCCCCC" }}>
        {content}
      </pre>
    );
  }

  return (
    <div style={{ fontFamily: '"Geist", sans-serif', display: "flex", flexDirection: "column", gap: "6px" }}>
      {(strategy || coverage) && (
        <div style={{ padding: "12px 14px", background: "#080808", border: "1px solid #222", borderRadius: "4px", marginBottom: "10px", display: "flex", gap: "24px", flexWrap: "wrap" }}>
          {strategy && (
            <div>
              <div style={{ fontSize: "10px", color: "#555", fontFamily: '"Geist Mono", monospace', letterSpacing: "0.5px", marginBottom: "4px" }}>STRATEGY</div>
              <div style={{ fontSize: "13px", color: "#CCCCCC" }}>{strategy}</div>
            </div>
          )}
          {coverage && (
            <div>
              <div style={{ fontSize: "10px", color: "#555", fontFamily: '"Geist Mono", monospace', letterSpacing: "0.5px", marginBottom: "4px" }}>COVERAGE TARGET</div>
              <div style={{ fontSize: "13px", color: "#34D399", fontFamily: '"Geist Mono", monospace', fontWeight: 600 }}>{coverage}</div>
            </div>
          )}
        </div>
      )}
      {sections.map((sec, i) => {
        const color = sectionColors[sec.key] ?? "#888";
        return (
          <div key={i} style={{ padding: "12px 14px", background: "#080808", border: "1px solid #222", borderRadius: "4px" }}>
            <div style={{
              fontSize: "10px",
              fontFamily: '"Geist Mono", monospace',
              fontWeight: 600,
              letterSpacing: "1px",
              textTransform: "uppercase",
              color,
              marginBottom: "10px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: color }} />
              {sectionLabels[sec.key] ?? sec.key}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {sec.items.map((item, j) => (
                <div key={j} style={{ fontSize: "13px", color: "#CCCCCC", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <span style={{ color: "#444", flexShrink: 0, marginTop: "1px", fontFamily: '"Geist Mono", monospace' }}>-</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
