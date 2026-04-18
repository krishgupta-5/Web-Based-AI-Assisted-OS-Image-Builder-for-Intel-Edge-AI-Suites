"use client";

import React from "react";

interface ApiDesignViewerProps {
  content: string;
}

export default function ApiDesignViewer({ content }: ApiDesignViewerProps) {
  const methodColors: Record<string, { bg: string; color: string; label: string }> = {
    GET: { bg: "#0D2D1A", color: "#34D399", label: "GET" },
    POST: { bg: "#0D1F2D", color: "#60A5FA", label: "POST" },
    PUT: { bg: "#2D1F0D", color: "#FBBF24", label: "PUT" },
    PATCH: { bg: "#2D1A00", color: "#FB923C", label: "PATCH" },
    DELETE: { bg: "#2D0D0D", color: "#F87171", label: "DELETE" },
  };

  // Parse YAML into endpoint groups using robust line-by-line parsing
  let groups: Array<{
    group: string;
    routes: Array<{
      method: string;
      path: string;
      description: string;
      auth_required: boolean;
      request_body: string;
      response: string;
    }>;
  }> = [];

  // Extract top-level metadata
  let baseUrl = "";
  let authHeader = "";
  let format = "";

  try {
    const lines = content.split("\n");

    // Extract top-level fields
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("base_url:")) baseUrl = trimmed.replace("base_url:", "").trim();
      if (trimmed.startsWith("auth_header:")) authHeader = trimmed.replace("auth_header:", "").trim();
      if (trimmed.startsWith("format:")) format = trimmed.replace("format:", "").trim();
    }

    // Line-by-line state machine parser
    let currentGroup: string | null = null;
    let currentRoutes: typeof groups[0]["routes"] = [];
    let currentRoute: Partial<typeof groups[0]["routes"][0]> = {};
    let inRoutes = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Detect group start: "- group: auth"
      const groupMatch = trimmed.match(/^-\s*group:\s*(.+)$/);
      if (groupMatch) {
        // Save previous group if exists
        if (currentGroup !== null) {
          // Push last route if in progress
          if (currentRoute.method) {
            currentRoutes.push({
              method: currentRoute.method ?? "",
              path: currentRoute.path ?? "",
              description: currentRoute.description ?? "",
              auth_required: currentRoute.auth_required ?? false,
              request_body: currentRoute.request_body ?? "none",
              response: currentRoute.response ?? "",
            });
          }
          if (currentRoutes.length > 0) {
            groups.push({ group: currentGroup, routes: [...currentRoutes] });
          }
        }
        currentGroup = groupMatch[1].trim();
        currentRoutes = [];
        currentRoute = {};
        inRoutes = false;
        continue;
      }

      // Detect routes: block start
      if (trimmed === "routes:") {
        inRoutes = true;
        continue;
      }

      if (!currentGroup) continue;

      // Detect a new route entry: "- method: GET"
      const methodMatch = trimmed.match(/^-\s*method:\s*(.+)$/);
      if (methodMatch) {
        // Push previous route if in progress
        if (currentRoute.method) {
          currentRoutes.push({
            method: currentRoute.method ?? "",
            path: currentRoute.path ?? "",
            description: currentRoute.description ?? "",
            auth_required: currentRoute.auth_required ?? false,
            request_body: currentRoute.request_body ?? "none",
            response: currentRoute.response ?? "",
          });
        }
        currentRoute = { method: methodMatch[1].trim() };
        inRoutes = true;
        continue;
      }

      // Parse route fields
      if (inRoutes && currentRoute.method !== undefined) {
        const pathMatch = trimmed.match(/^path:\s*(.+)$/);
        if (pathMatch) { currentRoute.path = pathMatch[1].trim(); continue; }

        const descMatch = trimmed.match(/^description:\s*(.+)$/);
        if (descMatch) { currentRoute.description = descMatch[1].trim(); continue; }

        const authMatch = trimmed.match(/^auth_required:\s*(.+)$/);
        if (authMatch) { currentRoute.auth_required = authMatch[1].trim() === "true"; continue; }

        const bodyMatch = trimmed.match(/^request_body:\s*(.+)$/);
        if (bodyMatch) { currentRoute.request_body = bodyMatch[1].trim(); continue; }

        const respMatch = trimmed.match(/^response:\s*(.+)$/);
        if (respMatch) { currentRoute.response = respMatch[1].trim(); continue; }
      }
    }

    // Push the last route and group
    if (currentRoute.method) {
      currentRoutes.push({
        method: currentRoute.method ?? "",
        path: currentRoute.path ?? "",
        description: currentRoute.description ?? "",
        auth_required: currentRoute.auth_required ?? false,
        request_body: currentRoute.request_body ?? "none",
        response: currentRoute.response ?? "",
      });
    }
    if (currentGroup !== null && currentRoutes.length > 0) {
      groups.push({ group: currentGroup, routes: [...currentRoutes] });
    }
  } catch {
    // Fallback: render raw YAML as code
    groups = [];
  }

  if (groups.length === 0) {
    return (
      <pre style={{ margin: 0, fontSize: "12px", fontFamily: '"Geist Mono", monospace', lineHeight: "1.65", whiteSpace: "pre", color: "#CCCCCC" }}>
        {content}
      </pre>
    );
  }

  return (
    <div style={{ fontFamily: '"Geist", sans-serif', display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top-level API meta info */}
      {(baseUrl || format || authHeader) && (
        <div style={{
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          padding: "10px 14px",
          background: "#060606",
          border: "1px solid #1A1A1A",
          borderRadius: "6px",
        }}>
          {baseUrl && (
            <div>
              <div style={{ fontSize: "9px", color: "#555", fontFamily: '"Geist Mono", monospace', letterSpacing: "0.5px", marginBottom: "3px", textTransform: "uppercase" }}>Base URL</div>
              <div style={{ fontSize: "12px", color: "#60A5FA", fontFamily: '"Geist Mono", monospace', fontWeight: 500 }}>{baseUrl}</div>
            </div>
          )}
          {format && (
            <div>
              <div style={{ fontSize: "9px", color: "#555", fontFamily: '"Geist Mono", monospace', letterSpacing: "0.5px", marginBottom: "3px", textTransform: "uppercase" }}>Format</div>
              <div style={{ fontSize: "12px", color: "#CCCCCC", fontFamily: '"Geist Mono", monospace', fontWeight: 500 }}>{format.toUpperCase()}</div>
            </div>
          )}
          {authHeader && authHeader !== "none" && (
            <div>
              <div style={{ fontSize: "9px", color: "#555", fontFamily: '"Geist Mono", monospace', letterSpacing: "0.5px", marginBottom: "3px", textTransform: "uppercase" }}>Auth</div>
              <div style={{ fontSize: "12px", color: "#FBBF24", fontFamily: '"Geist Mono", monospace', fontWeight: 500 }}>{authHeader}</div>
            </div>
          )}
        </div>
      )}

      {/* Endpoint groups */}
      {groups.map((g, gi) => (
        <div key={gi}>
          <div style={{
            fontSize: "11px",
            fontFamily: '"Geist Mono", monospace',
            fontWeight: 600,
            letterSpacing: "1px",
            textTransform: "uppercase",
            color: "#888",
            marginBottom: "10px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#60A5FA" }} />
            {g.group}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {g.routes.map((r, ri) => {
              const mc = methodColors[r.method.toUpperCase()] ?? { bg: "#1A1A1A", color: "#AAAAAA", label: r.method };
              return (
                <div key={ri} style={{
                  padding: "14px 16px",
                  background: "#080808",
                  border: "1px solid #1E1E1E",
                  borderRadius: "6px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  transition: "border-color 0.15s ease",
                }}>
                  {/* Method + Path + Auth Badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: "11px",
                      fontFamily: '"Geist Mono", monospace',
                      fontWeight: 700,
                      letterSpacing: "0.5px",
                      padding: "4px 10px",
                      borderRadius: "4px",
                      background: mc.bg,
                      color: mc.color,
                      minWidth: "60px",
                      textAlign: "center",
                    }}>
                      {r.method.toUpperCase()}
                    </span>
                    <span style={{ fontSize: "13px", color: "#EAEAEA", fontFamily: '"Geist Mono", monospace', fontWeight: 500 }}>
                      {r.path}
                    </span>

                  </div>

                  {/* Description */}
                  {r.description && (
                    <div style={{ fontSize: "12px", color: "#999", lineHeight: "1.6", paddingLeft: "2px" }}>
                      {r.description}
                    </div>
                  )}

                  {/* Request body & Response in a mini-grid */}
                  <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", paddingLeft: "2px" }}>
                    {r.request_body && r.request_body !== "none" && r.request_body !== '"none"' && (
                      <div>
                        <div style={{ fontSize: "9px", color: "#555", fontFamily: '"Geist Mono", monospace', letterSpacing: "0.5px", marginBottom: "3px", textTransform: "uppercase" }}>Request Body</div>
                        <div style={{ fontSize: "12px", color: "#BBBBBB", fontFamily: '"Geist Mono", monospace' }}>
                          {r.request_body}
                        </div>
                      </div>
                    )}
                    {r.response && (
                      <div>
                        <div style={{ fontSize: "9px", color: "#555", fontFamily: '"Geist Mono", monospace', letterSpacing: "0.5px", marginBottom: "3px", textTransform: "uppercase" }}>Response</div>
                        <div style={{ fontSize: "12px", color: "#BBBBBB", fontFamily: '"Geist Mono", monospace' }}>
                          {r.response}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
