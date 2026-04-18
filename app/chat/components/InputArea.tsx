"use client";

import React from "react";

interface InputAreaProps {
  input: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  tokenQuota: {
    tokensUsed: number;
    tokensLimit: number;
    tokensRemaining: number;
    exhausted: boolean;
    resetAt: number;
  } | null;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleSend: () => void;
}

export default function InputArea({ 
  input, 
  textareaRef, 
  tokenQuota, 
  handleInputChange, 
  handleKeyDown, 
  handleSend 
}: InputAreaProps) {
  return (
    <div
      style={{
        background: "#080808",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        border: "1px solid #333",
        borderRadius: "8px",
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#555"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#333"; }}
    >
      <div style={{ color: "#888", fontFamily: '"Geist Mono", monospace', fontSize: "14px", userSelect: "none" }}>
        &gt;
      </div>
      <textarea
        ref={textareaRef}
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Enter command..."
        rows={1}
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          color: "#EAEAEA",
          fontSize: "14px",
          fontFamily: '"Geist Mono", monospace',
          resize: "none",
          lineHeight: "1.5",
          height: "auto",
          minHeight: "24px",
          maxHeight: "120px",
          overflowY: "auto",
          padding: "0",
          margin: "0",
        }}
      />
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <button
          style={{ background: "transparent", border: "none", color: "#A0A0A0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 8px", borderRadius: "6px", transition: "all 0.15s ease", fontSize: "16px", fontFamily: '"Geist Mono", monospace', fontWeight: 500 }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#EAEAEA"; (e.currentTarget as HTMLButtonElement).style.background = "#222"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          title="Attach File"
        >
          +
        </button>
        <button
          onClick={handleSend}
          disabled={tokenQuota?.exhausted}
          style={{
            background: (input.trim() && !tokenQuota?.exhausted) ? "#EAEAEA" : "transparent",
            border: `1px solid ${tokenQuota?.exhausted ? "#ff6b6b40" : input.trim() ? "#EAEAEA" : "#444"}`,
            color: tokenQuota?.exhausted ? "#ff6b6b" : input.trim() ? "#000000" : "#888",
            cursor: (input.trim() && !tokenQuota?.exhausted) ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "6px 14px",
            fontSize: "12px",
            fontWeight: 600,
            fontFamily: '"Geist Mono", monospace',
            textTransform: "uppercase",
            transition: "all 0.15s ease",
            borderRadius: "6px",
          }}
        >
          {tokenQuota?.exhausted ? "BURNED" : "Exec"}
        </button>
      </div>
    </div>
  );
}
