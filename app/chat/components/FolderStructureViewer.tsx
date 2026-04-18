"use client";

import React from "react";

interface FolderStructureViewerProps {
  content: string;
}

export default function FolderStructureViewer({ content }: FolderStructureViewerProps) {
  const lines = (content ?? "").split("\n");

  return (
    <div style={{ fontFamily: '"Geist Mono", monospace', fontSize: "13px", lineHeight: "1.7" }}>
      {lines.map((line, i) => {
        const trimmed = line.trimEnd();
        if (!trimmed) return <div key={i} style={{ height: "8px" }} />;

        // Root folder line
        const isRoot = i === 0 && !trimmed.startsWith("|") && !trimmed.startsWith("") && !trimmed.startsWith("") && !trimmed.startsWith("");
        // Detect if it's a folder (ends with /)
        const isFolder = trimmed.replace(/^[|]+\s]+/, "").endsWith("/");
        // Detect tree chars
        const treeMatch = trimmed.match(/^([|]+)+/);
        const treePrefix = treeMatch ? treeMatch[1] : "";
        const rest = trimmed.slice(treePrefix.length);

        if (isRoot) {
          return (
            <div key={i} style={{ color: "#EAEAEA", fontWeight: 600, marginBottom: "2px" }}>
              {trimmed}
            </div>
          );
        }

        return (
          <div key={i} style={{ display: "flex", alignItems: "baseline" }}>
            <span style={{ color: "#333", whiteSpace: "pre" }}>{treePrefix}</span>
            <span style={{ color: isFolder ? "#60A5FA" : "#CCCCCC", fontWeight: isFolder ? 500 : 400 }}>
              {rest}
            </span>
          </div>
        );
      })}
    </div>
  );
}
