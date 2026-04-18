"use client";

import React from "react";

interface LanguageBadgeProps {
  language: string;
}

export default function LanguageBadge({ language }: LanguageBadgeProps) {
  const labels: Record<string, string> = {
    yaml: "YAML",
    markdown: "MD",
    pipeline: "PIPELINE",
    dbschema: "SCHEMA",
    image: "IMG",
    folder: "TREE",
    apidesign: "API",
    testingplan: "TESTS",
  };
  return (
    <span
      style={{
        fontSize: "9px",
        color: "#A0A0A0",
        background: "#111",
        border: "1px solid #333",
        padding: "3px 8px",
        borderRadius: "4px",
        fontFamily: '"Geist Mono", monospace',
        letterSpacing: "0.5px",
        fontWeight: 500,
      }}
    >
      {labels[language] ?? language.toUpperCase()}
    </span>
  );
}
