"use client";

import React from "react";
import LanguageBadge from "@/app/chat/components/LanguageBadge";
import CopyButton from "@/app/chat/components/CopyButton";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  tools?: string[];
  file?: {
    name: string;
    language: string;
    content: string;
    dbSchema?: {
      mermaid: string;
      diagram: string;
    };
  };
  options?: string[];
}

interface FileHeaderProps {
  msg: Message;
  markdownMode: Record<string, "code" | "preview">;
  setMarkdownMode: React.Dispatch<React.SetStateAction<Record<string, "code" | "preview">>>;
}

export default function FileHeader({ msg, markdownMode, setMarkdownMode }: FileHeaderProps) {
  if (!msg.file) return null;
  const { language, name, content } = msg.file;
  const isMarkdown = language === "markdown";
  const isCopyable = ["yaml", "markdown", "folder", "apidesign", "testingplan"].includes(language);
  const currentMode = markdownMode[msg.id] ?? "preview";
  
  return (
    <div
      style={{
        padding: "10px 16px",
        background: "#080808",
        borderBottom: "1px solid #333",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "6px", height: "6px", background: "#666", borderRadius: "50%" }} />
        <span style={{ fontSize: "12px", color: "#EAEAEA", fontWeight: 500, fontFamily: '"Geist Mono", monospace' }}>
          {name}
        </span>
        <LanguageBadge language={language} />
      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {isMarkdown && (
          <>
            <button
              onClick={() => setMarkdownMode((prev) => ({ ...prev, [msg.id]: "code" }))}
              style={{ fontSize: "10px", color: currentMode === "code" ? "#EAEAEA" : "#A0A0A0", background: currentMode === "code" ? "#222" : "transparent", border: `1px solid ${currentMode === "code" ? "#555" : "#333"}`, padding: "4px 10px", borderRadius: "4px", cursor: "pointer", fontFamily: '"Geist Mono", monospace', transition: "all 0.15s" }}
            >
              CODE
            </button>
            <button
              onClick={() => setMarkdownMode((prev) => ({ ...prev, [msg.id]: "preview" }))}
              style={{ fontSize: "10px", color: currentMode === "preview" ? "#EAEAEA" : "#A0A0A0", background: currentMode === "preview" ? "#222" : "transparent", border: `1px solid ${currentMode === "preview" ? "#555" : "#333"}`, padding: "4px 10px", borderRadius: "4px", cursor: "pointer", fontFamily: '"Geist Mono", monospace', transition: "all 0.15s" }}
            >
              PREVIEW
            </button>
          </>
        )}
        {isCopyable && <CopyButton content={content} />}
      </div>
    </div>
  );
}
