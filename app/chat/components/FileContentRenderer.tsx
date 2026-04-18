"use client";

import React from "react";
import DbSchemaViewer from "@/app/chat/components/DbSchemaViewer";
import PipelineViewer from "@/app/chat/components/PipelineViewer";
import FolderStructureViewer from "@/app/chat/components/FolderStructureViewer";
import ApiDesignViewer from "@/app/chat/components/ApiDesignViewer";
import TestingPlanViewer from "@/app/chat/components/TestingPlanViewer";
import CodeRenderer from "@/app/chat/components/CodeRenderer";
import MarkdownRenderer from "@/app/chat/components/MarkdownRenderer";

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

interface FileContentRendererProps {
  msg: Message;
  markdownMode: Record<string, "code" | "preview">;
  activePipelineNodes: Record<string, string | null>;
  setActivePipelineNodes: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
}

export default function FileContentRenderer({ 
  msg, 
  markdownMode, 
  activePipelineNodes, 
  setActivePipelineNodes 
}: FileContentRendererProps) {
  if (!msg.file) return null;
  const { language, content } = msg.file;
  
  if (language === "dbschema")
    return (
      <DbSchemaViewer
        mermaid={msg.file.dbSchema?.mermaid ?? ""}
        diagram={msg.file.dbSchema?.diagram ?? content}
      />
    );
  if (language === "image")
    return (
      <div style={{ display: "flex" }}>
        <img
          src={content}
          alt={msg.file.name}
          style={{ maxWidth: "100%", maxHeight: "400px", objectFit: "contain", border: "1px solid #333", borderRadius: "4px" }}
        />
      </div>
    );
  if (language === "pipeline")
    return (
      <div style={{ minHeight: "400px", width: "100%", position: "relative" }}>
        <PipelineViewer
          content={content}
          msgId={msg.id}
          activeNode={activePipelineNodes[msg.id]}
          onActiveNodeChange={(nodeId) =>
            setActivePipelineNodes((prev) => ({ ...prev, [msg.id]: nodeId }))
          }
        />
      </div>
    );
  if (language === "folder")
    return <FolderStructureViewer content={content} />;
  if (language === "apidesign")
    return <ApiDesignViewer content={content} />;
  if (language === "testingplan")
    return <TestingPlanViewer content={content} />;
  if (language === "markdown")
    return markdownMode[msg.id] === "code" ? (
      <pre style={{ margin: 0, fontSize: "12px", fontFamily: '"Geist Mono", monospace', lineHeight: "1.65", whiteSpace: "pre", color: "#CCCCCC" }}>
        <CodeRenderer content={content} />
      </pre>
    ) : (
      <div style={{ margin: 0, fontSize: "13px", lineHeight: "1.65" }}>
        <MarkdownRenderer content={content} />
      </div>
    );
  return (
    <pre style={{ margin: 0, fontSize: "12px", fontFamily: '"Geist Mono", monospace', lineHeight: "1.65", whiteSpace: "pre", background: "#000" }}>
      <CodeRenderer content={content} />
    </pre>
  );
}
