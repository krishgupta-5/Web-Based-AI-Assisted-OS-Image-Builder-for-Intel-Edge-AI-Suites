'use client';

import React, { useState, useEffect, useRef } from 'react';

interface DbSchemaViewerProps {
  mermaid: string;
  diagram: string;
}

type ViewMode = 'diagram' | 'source';

export default function DbSchemaViewer({ mermaid: mermaidSource, diagram }: DbSchemaViewerProps) {
  const [mode, setMode] = useState<ViewMode>('diagram');
  const [isExpanded, setIsExpanded] = useState(false);
  const [mermaidSvg, setMermaidSvg] = useState<string>('');
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);

  const processedMermaid = mermaidSource.includes('direction')
    ? mermaidSource
    : mermaidSource.replace('erDiagram', 'erDiagram\n    direction LR');

  useEffect(() => {
    if (!processedMermaid.trim().startsWith('erDiagram')) return;

    const renderMermaid = async () => {
      try {
        const mermaid = (await import('mermaid')).default;

        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            primaryColor: '#1e293b',
            primaryTextColor: '#34d399',
            lineColor: '#34d399',
            mainBkg: '#0f172a',
            entityBkg: '#1e293b',
            entityBorder: '#334155',
          },
          er: {
            useMaxWidth: false,   // ✅ Critical: don't constrain SVG width
            diagramPadding: 40,
            layoutDirection: 'LR',
            minEntityHeight: 34,
            minEntityWidth: 200,
          },
        });

        const id = `er-diag-${Math.random().toString(36).substring(2, 11)}`;
        const { svg } = await mermaid.render(id, processedMermaid);

        // ✅ Parse the SVG to extract its real width/height from viewBox or width attrs
        const parser = new DOMParser();
        const doc = parser.parseFromString(svg, 'image/svg+xml');
        const svgEl = doc.querySelector('svg');

        let width = 0;
        let height = 0;

        if (svgEl) {
          // Mermaid sets width/height as style or attributes — check both
          const vb = svgEl.getAttribute('viewBox');
          if (vb) {
            const parts = vb.split(/[\s,]+/);
            width = parseFloat(parts[2]) || 0;
            height = parseFloat(parts[3]) || 0;
          }
          // Override width/height attrs so SVG renders at its natural size
          svgEl.removeAttribute('width');
          svgEl.removeAttribute('height');
          svgEl.style.width = `${width}px`;
          svgEl.style.height = `${height}px`;
          svgEl.style.maxWidth = 'none';

          const modifiedSvg = new XMLSerializer().serializeToString(svgEl);
          setMermaidSvg(modifiedSvg);
          setSvgDimensions({ width, height });
        } else {
          setMermaidSvg(svg);
        }
      } catch (error) {
        console.error('Mermaid rendering error:', error);
      }
    };

    renderMermaid();
  }, [processedMermaid]);

  const SCALE = 1.25;

  const scrollContainerStyle: React.CSSProperties = {
    width: '100%',
    height: isExpanded ? '85vh' : '600px',
    overflow: 'auto',
    backgroundColor: '#020617',
    backgroundImage: 'radial-gradient(#1e293b 1.2px, transparent 1.2px)',
    backgroundSize: '32px 32px',
    borderRadius: '12px',
    border: '1px solid #1e293b',
    transition: 'height 0.3s ease',
    position: 'relative',
  };

  // ✅ The spacer div tells the scroll container the TRUE scaled size
  // so scrollbars cover the full diagram — not the clipped version
  const spacerStyle: React.CSSProperties = {
    width: `${svgDimensions.width * SCALE + 80}px`,   // +80 for padding
    height: `${svgDimensions.height * SCALE + 80}px`,
    position: 'relative',
    flexShrink: 0,
  };

  // ✅ The SVG sits inside the spacer, scaled from top-left
  const svgWrapperStyle: React.CSSProperties = {
    position: 'absolute',
    top: '40px',
    left: '40px',
    transformOrigin: 'top left',
    transform: `scale(${SCALE})`,
  };

  const renderContent = () => {
    if (mode === 'source') {
      return (
        <div style={{
          ...scrollContainerStyle,
          backgroundColor: '#0a0a0a',
          backgroundImage: 'none',
          padding: '24px',
          boxSizing: 'border-box',
        }}>
          <pre style={{ margin: 0, fontSize: '13px', color: '#60a5fa', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            {processedMermaid}
          </pre>
        </div>
      );
    }

    return (
      <div style={scrollContainerStyle}>
        {/* Spacer expands scroll area to the full scaled size */}
        <div style={spacerStyle}>
          {/* SVG rendered at natural size, then scaled visually */}
          <div
            ref={wrapperRef}
            style={svgWrapperStyle}
            dangerouslySetInnerHTML={{ __html: mermaidSvg }}
          />
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          .mermaid-wrapper svg,
          [data-mermaid] svg {
            max-width: none !important;
            overflow: visible !important;
          }
          text.er.entityName {
            fill: #34d399 !important;
            font-size: 18px !important;
            font-weight: 900 !important;
          }
          path.er.relationshipLine {
            stroke: #64748b !important;
            stroke-width: 2.5px !important;
          }
          text.er.attributeBox {
            font-size: 14px !important;
            fill: #cbd5e1 !important;
          }
        `}} />
      </div>
    );
  };

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{
            background: 'rgba(52, 211, 153, 0.15)',
            color: '#34d399',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 800,
            border: '1px solid #34d399',
          }}>
            DATABASE BLUEPRINT
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#fff',
              padding: '6px 16px',
              borderRadius: '8px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {isExpanded ? 'Exit Fullscreen' : 'Enter Focus Mode'}
          </button>
        </div>

        <div style={{ display: 'flex', background: '#0f172a', borderRadius: '10px', padding: '4px', border: '1px solid #1e293b' }}>
          {(['diagram', 'source'] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '8px 18px',
                background: mode === m ? '#34d399' : 'transparent',
                border: 'none',
                borderRadius: '7px',
                color: mode === m ? '#020617' : '#94a3b8',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: '0.2s',
              }}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {renderContent()}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
        <div style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>
          Scale: 125% • Direction: Horizontal (LR)
          {svgDimensions.width > 0 && (
            <span style={{ marginLeft: '12px', opacity: 0.6 }}>
              {Math.round(svgDimensions.width)} × {Math.round(svgDimensions.height)}px
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '20px', fontSize: '11px', color: '#64748b' }}>
          <span>↔ Scroll right for more tables</span>
          <span>↕ Scroll down for fields</span>
        </div>
      </div>
    </div>
  );
}