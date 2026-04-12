"use client";

import React, { useState } from "react";

// ─────────────────────────────────────────────
// Pipeline YAML parsing functions
// ─────────────────────────────────────────────
function parsePipelineYaml(yamlText: string): Array<{
  id: string;
  title: string;
  type: string;
  description: string;
}> {
  try {
    const lines = yamlText.split("\n");
    const steps: Array<{
      id: string;
      title: string;
      type: string;
      description: string;
    }> = [];
    let inSteps = false;
    let current: Partial<(typeof steps)[0]> = {};

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (line === "steps:") {
        inSteps = true;
        continue;
      }
      if (!inSteps) continue;
      if (line.startsWith("flow:")) {
        if (current.id) steps.push(current as (typeof steps)[0]);
        break;
      }
      if (line.startsWith("- id:") || line.startsWith("-id:")) {
        if (current.id) steps.push(current as (typeof steps)[0]);
        const id = line
          .replace(/^-\s*id:\s*/, "")
          .trim()
          .replace(/^["']|["']$/g, "");
        current = { id, title: id, type: id, description: "" };
        continue;
      }
      const clean = line.replace(/^-\s+/, "");
      if (clean.startsWith("title:")) {
        current.title = clean
          .replace("title:", "")
          .trim()
          .replace(/^["']|["']$/g, "");
        continue;
      }
      if (clean.startsWith("type:")) {
        current.type = clean
          .replace("type:", "")
          .trim()
          .replace(/^["']|["']$/g, "");
        continue;
      }
      if (clean.startsWith("description:")) {
        current.description = clean
          .replace("description:", "")
          .trim()
          .replace(/^["']|["']$/g, "");
        continue;
      }
    }
    if (current.id && !steps.find((s) => s.id === current.id))
      steps.push(current as (typeof steps)[0]);
    return steps;
  } catch {
    return [];
  }
}

function parsePipelineMeta(yamlText: string): {
  name: string;
  version: string;
  trigger: string;
} {
  const get = (key: string) => {
    const match = new RegExp(`${key}:\\s*(.+)`).exec(yamlText);
    return match ? match[1].trim().replace(/^["']|["']$/g, "") : "—";
  };
  return {
    name: get("name"),
    version: get("version"),
    trigger: get("trigger"),
  };
}

// ─────────────────────────────────────────────
// Color Mapping
// ─────────────────────────────────────────────
function getNodeColor(id: string): string {
  const k = id.toLowerCase();
  if (["source", "ingest", "request"].some((x) => k.includes(x))) return "#22D3EE"; 
  if (["transform"].some((x) => k.includes(x))) return "#FBBF24"; 
  if (["process", "validate"].some((x) => k.includes(x))) return "#10B981"; 
  if (["storage", "store", "cache"].some((x) => k.includes(x))) return "#A78BFA"; 
  return "#EAEAEA"; 
}

interface PipelineViewerProps {
  content: string;
  msgId: string;
  activeNode?: string | null;
  onActiveNodeChange?: (nodeId: string | null) => void;
}

export default function PipelineViewer({ 
  content, 
  msgId, 
  activeNode: externalActiveNode,
  onActiveNodeChange 
}: PipelineViewerProps) {
  const [internalActiveNode, setInternalActiveNode] = useState<string | null>(null);
  const activeNode = externalActiveNode ?? internalActiveNode;
  const setActive = onActiveNodeChange ?? setInternalActiveNode;

  const nodes = parsePipelineYaml(content);
  const meta = parsePipelineMeta(content);
  const activeData = activeNode ? nodes.find((n) => n.id === activeNode) : null;

  return (
    <div style={{ fontFamily: '"Geist", sans-serif', width: "100%", height: "fit-content" }}>
      
      {/* ───────────────────────────────────────────── */}
      {/* TOP META HEADER                               */}
      {/* ───────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
          paddingBottom: "16px",
          borderBottom: "1px solid #1A1A1A",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div>
            <div style={{ fontSize: "10px", color: "#666", fontFamily: '"Geist Mono", monospace', textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
              Pipeline Entity
            </div>
            <div style={{ fontSize: "14px", color: "#EAEAEA", fontWeight: 500 }}>
              {meta.name}
            </div>
          </div>
          <div style={{ width: "1px", height: "24px", background: "#222" }} />
          <div>
            <div style={{ fontSize: "10px", color: "#666", fontFamily: '"Geist Mono", monospace', textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
              Trigger
            </div>
            <div style={{ fontSize: "13px", color: "#A1A1AA", fontFamily: '"Geist Mono", monospace' }}>
              {meta.trigger}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ padding: "4px 8px", background: "transparent", border: "1px solid #222", borderRadius: "2px", fontSize: "11px", color: "#888", fontFamily: '"Geist Mono", monospace' }}>
            VERSION v{meta.version}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "2px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981" }} />
            <span style={{ fontSize: "10px", color: "#10B981", fontFamily: '"Geist Mono", monospace', fontWeight: 600, letterSpacing: "0.5px" }}>LIVE</span>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────── */}
      {/* NODE ROW                                      */}
      {/* ───────────────────────────────────────────── */}
      {nodes.length === 0 ? (
        <div style={{ fontSize: "12px", color: "#666", padding: "16px 0", fontFamily: '"Geist Mono", monospace', textTransform: "uppercase" }}>
          [ NO NODES DETECTED ]
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap", // Enables clean wrapping instead of scrolling
            alignItems: "stretch",
            paddingBottom: "8px",
          }}
        >
          {nodes.map((node, i) => {
            const color = getNodeColor(node.id);
            const isActive = activeNode === node.id;
            const isLast = i === nodes.length - 1;

            return (
              <div 
                key={node.id} 
                style={{ 
                  display: "flex", 
                  alignItems: "stretch",
                  flex: "1 1 220px", // Allows the block to grow and shrink based on screen width
                  minWidth: "220px",
                  marginBottom: "16px"
                }}
              >
                {/* ── CARD ── */}
                <div
                  onClick={() => setActive(isActive ? null : node.id)}
                  style={{
                    flex: 1,
                    padding: "16px",
                    cursor: "pointer",
                    background: isActive ? "rgba(255, 255, 255, 0.04)" : "#050505",
                    border: "1px solid",
                    borderColor: isActive ? color : "#1A1A1A",
                    borderTop: `2px solid ${color}`,
                    borderRadius: "4px",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "#050505";
                  }}
                >
                  <div style={{ fontSize: "10px", color: "#666", fontFamily: '"Geist Mono", monospace', marginBottom: "12px", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>Step {String(i + 1).padStart(2, '0')}</span>
                    <span style={{ color: color }}>{node.type}</span>
                  </div>
                  
                  <div style={{ fontSize: "14px", color: "#EAEAEA", fontWeight: 500, marginBottom: "8px", lineHeight: "1.4" }}>
                    {node.title || node.id}
                  </div>
                  
                  <div style={{ fontSize: "12px", color: "#888", lineHeight: "1.5", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {node.description || "No description provided."}
                  </div>
                </div>

                {/* ── CONNECTOR ── */}
                {!isLast && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "32px",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="0" y1="12" x2="16" y2="12" />
                      <polyline points="10 6 16 12 10 18" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ───────────────────────────────────────────── */}
      {/* ACTIVE NODE DETAILS PANEL                     */}
      {/* ───────────────────────────────────────────── */}
      {activeData && (
        <div
          style={{
            padding: "20px",
            background: "#050505",
            border: "1px solid #1A1A1A",
            borderRadius: "4px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "24px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: "280px" }}>
            <div style={{ fontSize: "10px", color: "#666", letterSpacing: "1px", marginBottom: "8px", fontWeight: 600, textTransform: "uppercase", fontFamily: '"Geist Mono", monospace' }}>
              Node Inspector
            </div>
            <div style={{ fontSize: "16px", color: "#EAEAEA", fontWeight: 600, marginBottom: "6px" }}>
              {activeData.title}
            </div>
            <div style={{ fontSize: "12px", color: getNodeColor(activeData.id), marginBottom: "16px", fontFamily: '"Geist Mono", monospace' }}>
              type: {activeData.type}
            </div>
            <div style={{ fontSize: "13px", color: "#A1A1AA", lineHeight: "1.6", maxWidth: "600px" }}>
              {activeData.description || "No detailed description available for this node."}
            </div>
          </div>
          
          <button
            onClick={() => setActive(null)}
            style={{
              background: "transparent",
              border: "1px solid #222",
              color: "#888",
              padding: "6px 12px",
              borderRadius: "2px",
              fontSize: "10px",
              cursor: "pointer",
              fontFamily: '"Geist Mono", monospace',
              fontWeight: 600,
              textTransform: "uppercase",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#EAEAEA";
              e.currentTarget.style.borderColor = "#444";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#888";
              e.currentTarget.style.borderColor = "#222";
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}