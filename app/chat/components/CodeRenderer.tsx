"use client";

import React from "react";

interface CodeRendererProps {
  content: string;
}

export default function CodeRenderer({ content }: CodeRendererProps) {
  const keywords = [
    "import", "from", "const", "let", "var", "export", "default", "function",
    "return", "type", "interface", "if", "else", "for", "while", "def", "class",
    "async", "await", "true", "false",
  ];
  const types = [
    "string", "number", "boolean", "any", "void", "React", "useState", "useEffect",
  ];
  
  return (content ?? "").split("\n").map((line, i) => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith("#") || trimmedLine.startsWith("//"))
      return (
        <div key={i}>
          <span style={{ whiteSpace: "pre" }}>{line.match(/^\s*/)?.[0]}</span>
          <span style={{ color: "#888888", fontStyle: "italic" }}>{trimmedLine}</span>
        </div>
      );
    const tokens = line.split(/(\s+|[:{}()[\],;."']|(?<=")|(?='))/);
    return (
      <div key={i} style={{ minHeight: "19px" }}>
        {tokens.map((token, j) => {
          if (!token) return null;
          const trimmed = token.trim();
          if (keywords.includes(trimmed))
            return <span key={j} style={{ color: "#F472B6", fontWeight: 500 }}>{token}</span>;
          if (types.includes(trimmed))
            return <span key={j} style={{ color: "#60A5FA" }}>{token}</span>;
          if (!isNaN(Number(trimmed)) && trimmed !== "")
            return <span key={j} style={{ color: "#FBBF24" }}>{token}</span>;
          if (token.startsWith('"') || token.startsWith("'") || token.endsWith('"') || token.endsWith("'"))
            return <span key={j} style={{ color: "#34D399" }}>{token}</span>;
          const nextToken = tokens[j + 1]?.trim() ?? "";
          const nextActualToken = tokens.slice(j + 1).find((t) => t.trim() !== "") ?? "";
          if (/^[a-zA-Z_]\w*$/.test(trimmed) && nextToken === "(")
            return <span key={j} style={{ color: "#A78BFA", fontWeight: 500 }}>{token}</span>;
          if (/^[a-zA-Z_]\w*$/.test(trimmed) && nextActualToken === ":")
            return <span key={j} style={{ color: "#38BDF8" }}>{token}</span>;
          if ([":", "{", "}", "(", ")", "[", "]", "=", "+", "-", "*", "/", ";", ","].includes(trimmed))
            return <span key={j} style={{ color: "#888" }}>{token}</span>;
          return <span key={j} style={{ color: "#CCCCCC" }}>{token}</span>;
        })}
      </div>
    );
  });
}
