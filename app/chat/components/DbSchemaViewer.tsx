"use client";

import React, { useState, useEffect, useRef } from "react";

interface DbSchemaViewerProps {
  mermaid: string;
  diagram?: string;
}

type ViewMode = "diagram" | "source";

export default function DbSchemaViewer({
  mermaid: mermaidSource,
}: DbSchemaViewerProps) {
  const [mode, setMode] = useState<ViewMode>("diagram");
  const [isExpanded, setIsExpanded] = useState(false);
  const [mermaidSvg, setMermaidSvg] = useState<string>("");
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });
  const [isLoaded, setIsLoaded] = useState(false); // Smooth loading state
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Pan and Zoom State
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const processedMermaid = mermaidSource.includes("direction")
    ? mermaidSource
    : mermaidSource.replace("erDiagram", "erDiagram\n    direction LR");

  useEffect(() => {
    if (!processedMermaid.trim().startsWith("erDiagram")) return;

    const renderMermaid = async () => {
      setIsLoaded(false); // Reset loading state
      try {
        const mermaid = (await import("mermaid")).default;

        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            primaryColor: "#0A0A0A",
            primaryTextColor: "#EAEAEA",
            lineColor: "#444444",
            mainBkg: "transparent",
            entityBkg: "#0A0A0A",
            entityBorder: "#333333",
          },
          er: {
            useMaxWidth: true,
            diagramPadding: 40,
            layoutDirection: "LR",
            minEntityHeight: 30,
            minEntityWidth: 160,
          },
          fontFamily: '"Geist Mono", monospace',
        });

        const id = `er-diag-${Math.random().toString(36).substring(2, 11)}`;
        const { svg } = await mermaid.render(id, processedMermaid);

        const parser = new DOMParser();
        const doc = parser.parseFromString(svg, "image/svg+xml");
        const svgEl = doc.querySelector("svg");

        let width = 0;
        let height = 0;

        if (svgEl) {
          const vb = svgEl.getAttribute("viewBox");
          if (vb) {
            const parts = vb.split(/[\s,]+/);
            width = parseFloat(parts[2]) || 0;
            height = parseFloat(parts[3]) || 0;
          }

          svgEl.setAttribute("width", "100%");
          svgEl.setAttribute("height", "100%");
          svgEl.style.width = "100%";
          svgEl.style.height = "100%";
          svgEl.style.maxWidth = "100%";
          svgEl.style.maxHeight = "100%";

          const modifiedSvg = new XMLSerializer().serializeToString(svgEl);
          setMermaidSvg(modifiedSvg);
          setSvgDimensions({ width, height });
        } else {
          setMermaidSvg(svg);
        }

        // Trigger smooth fade-in after a tiny delay to allow DOM to inject SVG
        setTimeout(() => setIsLoaded(true), 50);
      } catch (error) {
        console.error("Mermaid rendering error:", error);
      }
    };

    renderMermaid();
  }, [processedMermaid]);

  // ─────────────────────────────────────────────
  // Interaction Handlers (Pan & Zoom)
  // ─────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    if (mode === "source") return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || mode === "source") return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 5));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.2));

  // ─────────────────────────────────────────────
  // Styles
  // ─────────────────────────────────────────────
  const containerStyle: React.CSSProperties = {
    width: "100%",
    height: isExpanded ? "85vh" : "600px",
    overflow: "hidden", // Standard clipping
    clipPath: "inset(0)", // Hard hardware clipping to prevent line bleed
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#050505",
    backgroundImage: "radial-gradient(#222 1px, transparent 1px)",
    backgroundSize: "20px 20px",
    borderRadius: "8px",
    border: "1px solid #1A1A1A",
    transition: "height 0.3s ease",
    boxSizing: "border-box",
    position: "relative",
    zIndex: 1, // Create a new stacking context
    // Interactive cursor styling
    cursor: mode === "source" ? "default" : isDragging ? "grabbing" : "grab",
  };

  const renderContent = () => {
    if (mode === "source") {
      return (
        <div
          style={{
            ...containerStyle,
            backgroundColor: "#000000",
            backgroundImage: "none",
            justifyContent: "flex-start",
            alignItems: "flex-start",
            padding: "24px",
            overflow: "auto",
          }}
        >
          <pre
            style={{
              margin: 0,
              fontSize: "13px",
              color: "#A78BFA",
              fontFamily: '"Geist Mono", monospace',
              whiteSpace: "pre-wrap",
            }}
          >
            {processedMermaid}
          </pre>
        </div>
      );
    }

    return (
      <div
        style={containerStyle}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* Wrapper for the fade-in animation */}
        <div
          style={{
            width: "100%",
            height: "100%",
            opacity: isLoaded ? 1 : 0,
            transition: "opacity 0.8s ease-in-out",
          }}
        >
          <div
            ref={wrapperRef}
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              // Apply the transform for panning and zooming
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: "center",
              transition: isDragging ? "none" : "transform 0.1s ease-out",
              pointerEvents: "none", // Let the parent container handle all mouse events
            }}
            dangerouslySetInnerHTML={{ __html: mermaidSvg }}
          />
        </div>

        {/* CSS Overrides for Mermaid injected SVG */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
            .mermaid-wrapper svg,
            [data-mermaid] svg {
              max-width: 100% !important;
              height: auto !important;
              overflow: hidden !important; /* Stop SVG internal bleed */
            }
            text.er.entityName {
              fill: #EAEAEA !important;
              font-size: 14px !important;
              font-weight: 600 !important;
              font-family: "Geist Mono", monospace !important;
            }
            path.er.relationshipLine {
              stroke: #555 !important;
              stroke-width: 1.5px !important;
            }
            text.er.attributeBox {
              font-size: 12px !important;
              fill: #888 !important;
              font-family: "Geist Mono", monospace !important;
            }
          `,
          }}
        />
      </div>
    );
  };

  return (
    <div style={{ fontFamily: '"Geist", sans-serif', width: "100%" }}>
      {/* ───────────────────────────────────────────── */}
      {/* HEADER CONTROLS                               */}
      {/* ───────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: "transparent",
              border: "1px solid #333",
              color: "#EAEAEA",
              padding: "6px 16px",
              borderRadius: "4px",
              fontSize: "11px",
              cursor: "pointer",
              fontWeight: 600,
              textTransform: "uppercase",
              fontFamily: '"Geist Mono", monospace',
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#666";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#333";
            }}
          >
            {isExpanded ? "Exit Fullscreen" : "Enter Focus Mode"}
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Zoom Controls (Only show if in Diagram mode) */}
          {mode === "diagram" && (
            <div style={{ display: "flex", gap: "4px", marginRight: "8px" }}>
              <button onClick={zoomOut} style={controlButtonStyle}>
                -
              </button>
              <button
                onClick={resetView}
                style={{ ...controlButtonStyle, fontSize: "9px" }}
              >
                RESET
              </button>
              <button onClick={zoomIn} style={controlButtonStyle}>
                +
              </button>
            </div>
          )}

          {/* Mode Toggles */}
          <div
            style={{
              display: "flex",
              background: "#050505",
              borderRadius: "4px",
              padding: "4px",
              border: "1px solid #1A1A1A",
            }}
          >
            {(["diagram", "source"] as ViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: "6px 16px",
                  background: mode === m ? "#222" : "transparent",
                  border: "none",
                  borderRadius: "2px",
                  color: mode === m ? "#EAEAEA" : "#666",
                  fontSize: "10px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "0.2s",
                  fontFamily: '"Geist Mono", monospace',
                  textTransform: "uppercase",
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────── */}
      {/* MAIN VIEWPORT                                 */}
      {/* ───────────────────────────────────────────── */}
      {renderContent()}

      {/* ───────────────────────────────────────────── */}
      {/* FOOTER INFO                                   */}
      {/* ───────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "12px",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "#666",
            fontFamily: '"Geist Mono", monospace',
            textTransform: "uppercase",
          }}
        >
          Scale: {Math.round(scale * 100)}% • Mode: Interactive
          {svgDimensions.width > 0 && (
            <span style={{ marginLeft: "12px", color: "#444" }}>
              Native Size: {Math.round(svgDimensions.width)} ×{" "}
              {Math.round(svgDimensions.height)}px
            </span>
          )}
        </div>
        {mode === "diagram" && (
          <div
            style={{
              fontSize: "10px",
              color: "#888",
              fontFamily: '"Geist Mono", monospace',
              textTransform: "uppercase",
            }}
          >
            [ DRAG TO PAN ] [ USE +/- BUTTONS TO ZOOM ]
          </div>
        )}
      </div>
    </div>
  );
}

// Helper style for the small zoom control buttons
const controlButtonStyle: React.CSSProperties = {
  background: "#050505",
  border: "1px solid #1A1A1A",
  color: "#A0A0A0",
  width: "28px",
  height: "28px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "4px",
  cursor: "pointer",
  fontFamily: '"Geist Mono", monospace',
  fontSize: "14px",
  fontWeight: 600,
  transition: "all 0.2s",
};
