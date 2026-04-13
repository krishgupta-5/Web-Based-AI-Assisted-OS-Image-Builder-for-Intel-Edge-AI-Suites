"use client";

import React, { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { getSessionId } from "@/app/api/generate/Sessionid";
import DbSchemaViewer from "@/app/chat/components/DbSchemaViewer";
import PipelineViewer from "@/app/chat/components/PipelineViewer";

export interface Message {
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

const initialMessages: Message[] = [];

interface ChatPanelProps {
  agentName: string;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  sessionId?: string;
  showLoginModal?: boolean;
  onShowLoginModal?: (show: boolean) => void;
}

type Step = "config" | "docker" | "pipeline" | "docs" | "db";

// ─────────────────────────────────────────────
// Copy Button
// ─────────────────────────────────────────────
function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const el = document.createElement("textarea");
      el.value = content;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "10px",
        color: copied ? "#34D399" : "#A0A0A0",
        background: "transparent",
        border: `1px solid ${copied ? "#34D39940" : "#333"}`,
        padding: "4px 12px",
        borderRadius: "4px",
        cursor: "pointer",
        fontFamily: '"Geist Mono", monospace',
        transition: "all 0.2s ease",
        fontWeight: 600,
        letterSpacing: "0.5px",
      }}
      onMouseEnter={(e) => {
        if (!copied) {
          e.currentTarget.style.color = "#FFFFFF";
          e.currentTarget.style.borderColor = "#666";
        }
      }}
      onMouseLeave={(e) => {
        if (!copied) {
          e.currentTarget.style.color = "#A0A0A0";
          e.currentTarget.style.borderColor = "#333";
        }
      }}
    >
      {copied ? "COPIED!" : "COPY"}
    </button>
  );
}

// ─────────────────────────────────────────────
// Language Badge
// ─────────────────────────────────────────────
function LanguageBadge({ language }: { language: string }) {
  const labels: Record<string, string> = {
    yaml: "YAML",
    markdown: "MD",
    pipeline: "PIPELINE",
    dbschema: "SCHEMA",
    image: "IMG",
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

export default function ChatPanel({
  agentName,
  onToggleSidebar,
  isSidebarOpen = true,
  sessionId,
  showLoginModal,
  onShowLoginModal,
}: ChatPanelProps) {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [markdownMode, setMarkdownMode] = useState<
    Record<string, "code" | "preview">
  >({});
  const [generatedData, setGeneratedData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [hasGeneratedConfig, setHasGeneratedConfig] = useState(false);
  const [isModifyMode, setIsModifyMode] = useState(false);

  // Custom token counter state
  const [tokensUsed, setTokensUsed] = useState(24592);
  const [isTokenHovered, setIsTokenHovered] = useState(false);
  const TOTAL_TOKENS = 500000;

  // Per-message pipeline active node
  const [activePipelineNodes, setActivePipelineNodes] = useState<
    Record<string, string | null>
  >({});
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    messageId: string;
    messageContent: string;
    messageRole: string;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    const handleContextMenu = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    if (contextMenu?.visible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('contextmenu', handleContextMenu);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [contextMenu?.visible]);

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const el = document.createElement("textarea");
      el.value = content;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setContextMenu(null);
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    setContextMenu(null);
  };

  const handleEditMessage = (messageId: string, content: string) => {
    const newContent = prompt('Edit message:', content);
    if (newContent && newContent !== content) {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, content: newContent } : msg
      ));
    }
    setContextMenu(null);
  };

  // Load chat history on component mount
  useEffect(() => {
    const loadChatHistory = async () => {
      // Skip loading chat history if user is not authenticated
      if (!isSignedIn) {
        return;
      }
      // Clear current messages when loading a new session
      setMessages([]);
      setGeneratedData(null);
      setHasGeneratedConfig(false);
      setIsModifyMode(false);

      try {
        const currentSessionId = sessionId || getSessionId();

        let messagesResponse;
        let messagesData;
        let foundCompleteResult = false;
        let completeResultData = null;

        try {
          messagesResponse = await fetch(
            `/api/chat-history?sessionId=${currentSessionId}`,
          );
          if (!messagesResponse.ok) return;

          messagesData = await messagesResponse.json();
        } catch (error) {
          console.error("Failed to fetch chat history:", error);
          return;
        }

        const historyMessages: Message[] = (messagesData?.messages || []).map(
          (msg: any) => {
            let content = msg.content;

            // For assistant messages, check if they contain complete result data
            if (msg.role === "assistant") {
              try {
                const parsed = JSON.parse(msg.content);
                if (
                  parsed.yaml ||
                  parsed.docker ||
                  parsed.pipeline ||
                  parsed.markdown
                ) {
                  // This is a complete generation result - store it for later
                  foundCompleteResult = true;
                  completeResultData = parsed;
                  content =
                    "Configuration generated successfully. You can view the generated files below.";
                }
              } catch (e) {
                // If it's not JSON, keep the original content
                content = msg.content;
              }
            }

            return {
              id: msg.id,
              role: msg.role,
              content,
              timestamp: new Date(
                msg.createdAt?.toDate?.() || msg.createdAt,
              ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };
          },
        );

        setMessages(historyMessages);

        // If we found complete result data, set it now (after messages are set)
        if (foundCompleteResult && completeResultData) {
          setGeneratedData(completeResultData);
          setHasGeneratedConfig(true);
          return; // We're done - no API calls needed
        }

        // If no complete result found in messages, try to load from artifacts
        console.log(
          "No complete result found in messages, checking artifacts...",
        );
      } catch (error) {
        console.error("Failed to load chat history:", error);
      }
    };

    loadChatHistory();
  }, [sessionId, isSignedIn]);

  const detectStep = (text: string): Step => {
    const lower = text.toLowerCase();
    if (isModifyMode) return "config";

    // For initial generation (not modify mode), prioritize config step
    // DB step should only be triggered explicitly after config is generated
    if (hasGeneratedConfig) {
      if (
        lower.includes("db schema") ||
        lower.includes("database schema") ||
        lower.includes("view db") ||
        lower.includes("show db") ||
        lower.includes("show schema")
      )
        return "db";
      if (lower.includes("docker") || lower.includes("continue"))
        return "docker";
      if (lower.includes("pipeline") || lower.includes("show pipeline"))
        return "pipeline";
      if (
        lower.includes("docs") ||
        lower.includes("documentation") ||
        lower.includes("readme") ||
        lower.includes("generate docs")
      )
        return "docs";
    }

    return "config";
  };

  const buildAssistantMessage = (
    step: Step,
    data: any,
    isFirstConfig: boolean,
    modifying: boolean,
  ): { content: string; file: Message["file"]; options: string[] } => {
    if (step === "config")
      return {
        content: modifying
          ? "Configuration updated based on your changes.\nReady to continue whenever you are."
          : isFirstConfig
            ? "System config generated.\nModify parameters below or proceed to Docker setup."
            : "System config loaded.",
        file: {
          name: "system-config.yaml",
          language: "yaml",
          content: data.yaml,
        },
        options: modifying ? ["Continue"] : ["Continue", "Modify"],
      };
    if (step === "docker")
      return {
        content:
          "Docker Compose configuration generated. Services, volumes, and health checks are bound.",
        file: {
          name: "docker-compose.yaml",
          language: "yaml",
          content: data.docker,
        },
        options: ["Show Pipeline"],
      };
    if (step === "pipeline")
      return {
        content:
          "Pipeline architecture mapped. Displaying active data flow nodes.",
        file: {
          name: "pipeline.yaml",
          language: "pipeline",
          content: data.pipeline,
        },
        options: ["Generate Docs"],
      };
    if (step === "docs")
      return {
        content: "Project documentation generated.",
        file: {
          name: "README.md",
          language: "markdown",
          content: data.markdown,
        },
        options: ["View DB Schema"],
      };
    if (!data.dbSchema)
      return {
        content:
          'ERR: DB schema not responding.\n\nDiagnostics:\n- n8n webhook timeout\n- "Respond to Webhook" node disconnected\n- N8N_WEBHOOK_URL missing in .env.local\n\nVerify workflow and retry.',
        file: undefined,
        options: ["View DB Schema"],
      };
    return {
      content: "Database schema rendered via n8n → Gemini → Kroki.",
      file: {
        name: "schema.er",
        language: "dbschema",
        content: data.dbSchema.diagram ?? "",
        dbSchema: {
          mermaid: data.dbSchema.mermaid ?? "",
          diagram: data.dbSchema.diagram ?? "",
        },
      },
      options: [],
    };
  };

  const handleSend = async (overrideInput?: string) => {
    // Check if user is authenticated
    if (!isSignedIn) {
      // Show login modal instead of redirecting
      onShowLoginModal?.(true);
      return;
    }

    const textToSend = (overrideInput ?? input).trim();
    if (!textToSend) return;
    const step = detectStep(textToSend);
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!overrideInput) setInput("");
    setIsTyping(true);
    if (textareaRef.current && !overrideInput)
      textareaRef.current.style.height = "24px";

    // Simulate token increment on message send
    setTokensUsed((prev) => prev + Math.floor(Math.random() * 50) + 10);

    try {
      let data = generatedData;
      const needsFreshData = !data || isModifyMode || step === "config";
      if (needsFreshData) {
        let res;
        try {
          res = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: textToSend,
              mode: isModifyMode ? "modify" : "generate",
              sessionId: sessionId || getSessionId(),
            }),
          });
          if (!res.ok) throw new Error(`API error: ${res.status}`);
          data = await res.json();
          if (data.error) throw new Error(data.error);

          // Add tokens from backend if available, otherwise simulate usage
          if (data.tokens) setTokensUsed((prev) => prev + data.tokens);
        } catch (error) {
          console.error("Failed to send message:", error);
          setIsTyping(false);
          return;
        }
        setGeneratedData(data);
      }
      const isFirstConfig = !hasGeneratedConfig;
      const { content, file, options } = buildAssistantMessage(
        step,
        data,
        isFirstConfig,
        isModifyMode,
      );
      if (step === "config" && isFirstConfig) setHasGeneratedConfig(true);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          file,
          options,
        },
      ]);
      setIsModifyMode(false);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            `ERR: Execution failed. ${err instanceof Error ? err.message : ""}`.trim(),
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    }
    setIsTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleLoginModalClose = () => {
    onShowLoginModal?.(false);
  };

  const handleLoginRedirect = () => {
    window.location.href = "/login";
  };

  // ─────────────────────────────────────────────
  // Syntax-highlighted Code
  // ─────────────────────────────────────────────
  const renderCode = (content: string) => {
    const keywords = [
      "import",
      "from",
      "const",
      "let",
      "var",
      "export",
      "default",
      "function",
      "return",
      "type",
      "interface",
      "if",
      "else",
      "for",
      "while",
      "def",
      "class",
      "async",
      "await",
      "true",
      "false",
    ];
    const types = [
      "string",
      "number",
      "boolean",
      "any",
      "void",
      "React",
      "useState",
      "useEffect",
    ];
    return (content ?? "").split("\n").map((line, i) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("#") || trimmedLine.startsWith("//"))
        return (
          <div key={i}>
            <span style={{ whiteSpace: "pre" }}>{line.match(/^\s*/)?.[0]}</span>
            <span style={{ color: "#888888", fontStyle: "italic" }}>
              {trimmedLine}
            </span>
          </div>
        );
      const tokens = line.split(/(\s+|[:{}()[\],;."']|(?<=")|(?='))/);
      return (
        <div key={i} style={{ minHeight: "19px" }}>
          {tokens.map((token, j) => {
            if (!token) return null;
            const trimmed = token.trim();
            if (keywords.includes(trimmed))
              return (
                <span key={j} style={{ color: "#F472B6", fontWeight: 500 }}>
                  {token}
                </span>
              );
            if (types.includes(trimmed))
              return (
                <span key={j} style={{ color: "#60A5FA" }}>
                  {token}
                </span>
              );
            if (!isNaN(Number(trimmed)) && trimmed !== "")
              return (
                <span key={j} style={{ color: "#FBBF24" }}>
                  {token}
                </span>
              );
            if (
              token.startsWith('"') ||
              token.startsWith("'") ||
              token.endsWith('"') ||
              token.endsWith("'")
            )
              return (
                <span key={j} style={{ color: "#34D399" }}>
                  {token}
                </span>
              );
            const nextToken = tokens[j + 1]?.trim() ?? "";
            const nextActualToken =
              tokens.slice(j + 1).find((t) => t.trim() !== "") ?? "";
            if (/^[a-zA-Z_]\w*$/.test(trimmed) && nextToken === "(")
              return (
                <span key={j} style={{ color: "#A78BFA", fontWeight: 500 }}>
                  {token}
                </span>
              );
            if (/^[a-zA-Z_]\w*$/.test(trimmed) && nextActualToken === ":")
              return (
                <span key={j} style={{ color: "#38BDF8" }}>
                  {token}
                </span>
              );
            if (
              [
                ":",
                "{",
                "}",
                "(",
                ")",
                "[",
                "]",
                "=",
                "+",
                "-",
                "*",
                "/",
                ";",
                ",",
              ].includes(trimmed)
            )
              return (
                <span key={j} style={{ color: "#888" }}>
                  {token}
                </span>
              );
            return (
              <span key={j} style={{ color: "#CCCCCC" }}>
                {token}
              </span>
            );
          })}
        </div>
      );
    });
  };

  // ─────────────────────────────────────────────
  // Markdown Preview
  // ─────────────────────────────────────────────
  const renderMarkdownPreview = (content: string) => {
    return (content ?? "").split("\n").map((line, i) => {
      const tLine = line.trim();
      if (tLine.startsWith("# "))
        return (
          <div
            key={i}
            style={{
              color: "#FFFFFF",
              fontSize: "17px",
              fontWeight: 500,
              marginTop: "24px",
              marginBottom: "12px",
              paddingBottom: "10px",
              borderBottom: "1px solid #333",
              fontFamily: '"Geist Mono", monospace',
              letterSpacing: "-0.5px",
            }}
          >
            {tLine.substring(2)}
          </div>
        );
      if (tLine.startsWith("## "))
        return (
          <div
            key={i}
            style={{
              color: "#EAEAEA",
              fontSize: "13px",
              fontWeight: 500,
              marginTop: "18px",
              marginBottom: "8px",
              fontFamily: '"Geist Mono", monospace',
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ color: "#888" }}>##</span>
            {tLine.substring(3)}
          </div>
        );
      if (tLine.startsWith("### "))
        return (
          <div
            key={i}
            style={{
              color: "#A0A0A0",
              fontSize: "10px",
              fontWeight: 500,
              marginTop: "14px",
              marginBottom: "6px",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              fontFamily: '"Geist Mono", monospace',
            }}
          >
            {tLine.substring(4)}
          </div>
        );
      if (tLine.startsWith("- ")) {
        const inner = tLine
          .substring(2)
          .replace(/\*\*(.+?)\*\*/g, "<BOLD>$1</BOLD>")
          .replace(/`(.+?)`/g, "<CODE>$1</CODE>");
        return (
          <div
            key={i}
            style={{
              color: "#CCCCCC",
              marginLeft: "12px",
              marginBottom: "6px",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              lineHeight: "1.6",
              fontSize: "13px",
            }}
          >
            <span style={{ color: "#888", flexShrink: 0, marginTop: "1px" }}>
              —
            </span>
            <span
              dangerouslySetInnerHTML={{
                __html: inner
                  .replace(
                    /<BOLD>(.+?)<\/BOLD>/g,
                    '<span style="color:#FFFFFF;font-weight:600;">$1</span>',
                  )
                  .replace(
                    /<CODE>(.+?)<\/CODE>/g,
                    '<code style="font-size:11px;background:#111;padding:2px 6px;border-radius:4px;color:#A78BFA;border:1px solid #333;font-family:Geist Mono,monospace;">$1</code>',
                  ),
              }}
            />
          </div>
        );
      }
      if (/^\d+\./.test(tLine)) {
        const dotIdx = tLine.indexOf(".");
        return (
          <div
            key={i}
            style={{
              color: "#CCCCCC",
              marginLeft: "12px",
              marginBottom: "6px",
              display: "flex",
              gap: "10px",
              lineHeight: "1.6",
              fontSize: "13px",
            }}
          >
            <span
              style={{
                color: "#A0A0A0",
                fontFamily: '"Geist Mono", monospace',
                flexShrink: 0,
                fontWeight: 500,
              }}
            >
              {tLine.substring(0, dotIdx)}.
            </span>
            <span>{tLine.substring(dotIdx + 1).trim()}</span>
          </div>
        );
      }
      if (tLine.startsWith("```"))
        return <div key={i} style={{ height: "4px" }} />;
      if (tLine.includes("`")) {
        const parts = tLine.split(/(`[^`]+`)/g);
        return (
          <div
            key={i}
            style={{
              color: "#CCCCCC",
              marginBottom: "6px",
              lineHeight: "1.65",
              minHeight: "19px",
              fontSize: "13px",
            }}
          >
            {parts.map((part, j) =>
              part.startsWith("`") && part.endsWith("`") ? (
                <code
                  key={j}
                  style={{
                    fontSize: "11px",
                    background: "#111",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    color: "#A78BFA",
                    border: "1px solid #333",
                    fontFamily: '"Geist Mono", monospace',
                  }}
                >
                  {part.slice(1, -1)}
                </code>
              ) : (
                <span key={j}>{part}</span>
              ),
            )}
          </div>
        );
      }
      return (
        <div
          key={i}
          style={{
            color: "#CCCCCC",
            marginBottom: "6px",
            lineHeight: "1.65",
            minHeight: "19px",
            fontSize: "13px",
          }}
        >
          {line}
        </div>
      );
    });
  };

  // ─────────────────────────────────────────────
  // File Content Renderer
  // ─────────────────────────────────────────────
  const renderFileContent = (msg: Message) => {
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
            style={{
              maxWidth: "100%",
              maxHeight: "400px",
              objectFit: "contain",
              border: "1px solid #333",
              borderRadius: "4px",
            }}
          />
        </div>
      );
    if (language === "pipeline")
      return (
        <div
          style={{ minHeight: "400px", width: "100%", position: "relative" }}
        >
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
    if (language === "markdown")
      return markdownMode[msg.id] === "code" ? (
        <pre
          style={{
            margin: 0,
            fontSize: "12px",
            fontFamily: '"Geist Mono", monospace',
            lineHeight: "1.65",
            whiteSpace: "pre",
            color: "#CCCCCC",
          }}
        >
          {renderCode(content)}
        </pre>
      ) : (
        <div style={{ margin: 0, fontSize: "13px", lineHeight: "1.65" }}>
          {renderMarkdownPreview(content)}
        </div>
      );
    return (
      <pre
        style={{
          margin: 0,
          fontSize: "12px",
          fontFamily: '"Geist Mono", monospace',
          lineHeight: "1.65",
          whiteSpace: "pre",
          background: "#000",
        }}
      >
        {renderCode(content)}
      </pre>
    );
  };

  // ─────────────────────────────────────────────
  // File Header
  // ─────────────────────────────────────────────
  const renderFileHeader = (msg: Message) => {
    if (!msg.file) return null;
    const { language, name, content } = msg.file;
    const isMarkdown = language === "markdown";
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
          <div
            style={{
              width: "6px",
              height: "6px",
              background: "#666",
              borderRadius: "50%",
            }}
          />
          <span
            style={{
              fontSize: "12px",
              color: "#EAEAEA",
              fontWeight: 500,
              fontFamily: '"Geist Mono", monospace',
            }}
          >
            {name}
          </span>
          <LanguageBadge language={language} />
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {isMarkdown && (
            <>
              <button
                onClick={() =>
                  setMarkdownMode((prev) => ({ ...prev, [msg.id]: "code" }))
                }
                style={{
                  fontSize: "10px",
                  color: currentMode === "code" ? "#EAEAEA" : "#A0A0A0",
                  background: currentMode === "code" ? "#222" : "transparent",
                  border: `1px solid ${currentMode === "code" ? "#555" : "#333"}`,
                  padding: "4px 10px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontFamily: '"Geist Mono", monospace',
                  transition: "all 0.15s",
                }}
              >
                CODE
              </button>
              <button
                onClick={() =>
                  setMarkdownMode((prev) => ({ ...prev, [msg.id]: "preview" }))
                }
                style={{
                  fontSize: "10px",
                  color: currentMode === "preview" ? "#EAEAEA" : "#A0A0A0",
                  background:
                    currentMode === "preview" ? "#222" : "transparent",
                  border: `1px solid ${currentMode === "preview" ? "#555" : "#333"}`,
                  padding: "4px 10px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontFamily: '"Geist Mono", monospace',
                  transition: "all 0.15s",
                }}
              >
                PREVIEW
              </button>
            </>
          )}
          {["yaml", "markdown"].includes(language) && (
            <CopyButton content={content} />
          )}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────
  // Input Area
  // ------------------------------------------------------------------
  const renderInputArea = () => {
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
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#555";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#333";
        }}
      >
        <div
          style={{
            color: "#888",
            fontFamily: '"Geist Mono", monospace',
            fontSize: "14px",
            userSelect: "none",
          }}
        >
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
            style={{
              background: "transparent",
              border: "none",
              color: "#A0A0A0",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px 8px",
              borderRadius: "6px",
              transition: "all 0.15s ease",
              fontSize: "16px",
              fontFamily: '"Geist Mono", monospace',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#EAEAEA";
              (e.currentTarget as HTMLButtonElement).style.background = "#222";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#A0A0A0";
              (e.currentTarget as HTMLButtonElement).style.background =
                "transparent";
            }}
            title="Attach File"
          >
            +
          </button>
          <button
            onClick={() => handleSend()}
            style={{
              background: input.trim() ? "#EAEAEA" : "transparent",
              border: input.trim() ? "1px solid #EAEAEA" : "1px solid #444",
              color: input.trim() ? "#000000" : "#888",
              cursor: input.trim() ? "pointer" : "default",
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
            Exec
          </button>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────
  // Main Render
  // ─────────────────────────────────────────────
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#000000",
        overflow: "hidden",
        minWidth: 0,
        position: "relative",
        fontFamily: '"Geist", sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          zIndex: 10,
          borderBottom: "1px solid #111",
        }}
      >
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <button
            onClick={onToggleSidebar}
            style={{
              background: "transparent",
              border: "1px solid #333",
              color: "#A0A0A0",
              cursor: "pointer",
              display: isSidebarOpen ? "none" : "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px 10px",
              borderRadius: "6px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#EAEAEA";
              e.currentTarget.style.borderColor = "#555";
              (e.currentTarget as HTMLButtonElement).style.background = "#111";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#A0A0A0";
              e.currentTarget.style.borderColor = "#333";
              (e.currentTarget as HTMLButtonElement).style.background =
                "transparent";
            }}
          >
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                fontFamily: '"Geist Mono", monospace',
                letterSpacing: "0.5px",
              }}
            >
              MENU
            </span>
          </button>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#EAEAEA",
              letterSpacing: "1px",
              fontFamily: '"Geist Mono", monospace',
            }}
          >
            EDGE-OS{" "}
            <span style={{ color: "#666", fontWeight: 400 }}>// WKSP</span>
          </div>
        </div>

        {/* Right Actions: Token Count & Settings */}
        {isSignedIn && (
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {/* Token Widget */}
            <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              background: "#111",
              border: "1px solid #333",
              borderRadius: "6px",
              fontFamily: '"Geist Mono", monospace',
              fontSize: "11px",
              color: "#A0A0A0",
              cursor: "default",
              transition: "all 0.2s ease",
              minWidth: "120px",
              justifyContent: "center",
            }}
            title="Tokens utilized this session"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#555";
              e.currentTarget.style.color = "#EAEAEA";
              setIsTokenHovered(true);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#333";
              e.currentTarget.style.color = "#A0A0A0";
              setIsTokenHovered(false);
            }}
          >
            <span>
              {isTokenHovered
                ? `${tokensUsed.toLocaleString()} / ${TOTAL_TOKENS.toLocaleString()}`
                : `${tokensUsed.toLocaleString()} TOKENS`}
            </span>
          </div>

          {/* Settings Button */}
          <button
            onClick={() => router.push("/settings")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px 12px",
              background: "transparent",
              border: "1px solid #333",
              borderRadius: "6px",
              color: "#A0A0A0",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            title="Settings"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#555";
              e.currentTarget.style.color = "#EAEAEA";
              e.currentTarget.style.background = "#111";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#333";
              e.currentTarget.style.color = "#A0A0A0";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                fontFamily: '"Geist Mono", monospace',
                letterSpacing: "0.5px",
              }}
            >
              SETTINGS
            </span>
          </button>
        </div>
        )}
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: "120px" }}>
          {messages.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "40px 20px",
                maxWidth: "900px",
                margin: "0 auto",
                width: "100%",
              }}
            >
              <div style={{ marginBottom: "64px" }}>
                <div
                  style={{
                    color: "#888",
                    fontSize: "11px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontFamily: '"Geist Mono", monospace',
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  Status: <span style={{ color: "#EAEAEA" }}>ONLINE</span>
                </div>
                <h1
                  style={{
                    fontSize: "32px",
                    fontWeight: 500,
                    color: "#FFFFFF",
                    letterSpacing: "-1px",
                    margin: 0,
                    fontFamily: '"Geist", sans-serif',
                  }}
                >
                  System Initialized.
                </h1>
                <div
                  style={{
                    color: "#A0A0A0",
                    fontSize: "14px",
                    marginTop: "16px",
                    maxWidth: "600px",
                    lineHeight: "1.6",
                    fontFamily: '"Geist", sans-serif',
                  }}
                >
                  Development environment active. Awaiting input for
                  architecture synthesis, infrastructure deployment, or codebase
                  manipulation.
                </div>
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#888",
                  fontWeight: 600,
                  letterSpacing: "1px",
                  marginBottom: "16px",
                  textTransform: "uppercase",
                  fontFamily: '"Geist Mono", monospace',
                }}
              >
                AVAILABLE MACROS
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "1px",
                  background: "#333",
                  border: "1px solid #333",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                {[
                  {
                    title: "Initialize Complete SaaS",
                    desc: "Scaffold agents, backend, frontend, CI/CD, and deployment infrastructure.",
                    text: "Create a complete AI SaaS including agents, backend, frontend, CI/CD, and deployment",
                  },
                  {
                    title: "Build RAG Pipeline",
                    desc: "Design an AI system with RAG, embeddings, and a scalable vector database.",
                    text: "Design an AI system with RAG pipeline, embeddings, and vector database",
                  },
                  {
                    title: "Enterprise Architecture",
                    desc: "Generate a production-ready AI architecture focused on security and scale.",
                    text: "Generate an enterprise-grade AI architecture with security and scaling",
                  },
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt.text)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      padding: "24px 20px",
                      background: "#080808",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "#111";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "#080808";
                    }}
                  >
                    <div
                      style={{
                        color: "#EAEAEA",
                        fontSize: "12px",
                        fontWeight: 600,
                        marginBottom: "8px",
                        fontFamily: '"Geist Mono", monospace',
                        display: "flex",
                        alignItems: "center",
                        textTransform: "uppercase",
                      }}
                    >
                      <span style={{ color: "#666", marginRight: "8px" }}>
                        &gt;
                      </span>
                      {prompt.title}
                    </div>
                    <div
                      style={{
                        color: "#888",
                        fontSize: "13px",
                        lineHeight: "1.6",
                        fontFamily: '"Geist", sans-serif',
                      }}
                    >
                      {prompt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div
              style={{
                maxWidth: "900px",
                width: "100%",
                margin: "0 auto",
                padding: "20px 20px 0",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {messages.map((msg, idx) => (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    padding: "24px 0",
                    borderBottom:
                      idx !== messages.length - 1 ? "1px solid #222" : "none",
                    width: "100%",
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({
                      visible: true,
                      x: e.clientX,
                      y: e.clientY,
                      messageId: msg.id,
                      messageContent: msg.content,
                      messageRole: msg.role,
                    });
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: msg.role === "user" ? "#A0A0A0" : "#EAEAEA",
                      fontFamily: '"Geist Mono", monospace',
                      marginBottom: "12px",
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                    }}
                  >
                    {msg.role === "user" ? "SAHIL" : "SYSTEM"}
                  </div>
                  {msg.tools && (
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        marginBottom: "16px",
                        flexWrap: "wrap",
                      }}
                    >
                      {msg.tools.map((tool) => (
                        <span
                          key={tool}
                          style={{
                            fontSize: "10px",
                            color: "#A0A0A0",
                            background: "#111",
                            border: "1px solid #333",
                            padding: "4px 8px",
                            fontFamily: '"Geist Mono", monospace',
                            borderRadius: "4px",
                          }}
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  )}
                  <div
                    style={{
                      width: "100%",
                      color: "#CCCCCC",
                      fontSize: "14px",
                      lineHeight: "1.7",
                      whiteSpace: "pre-line",
                      fontFamily: '"Geist", sans-serif',
                    }}
                  >
                    {msg.content}
                    {msg.file && (
                      <div
                        style={{
                          marginTop: "20px",
                          border: "1px solid #333",
                          background: "#000",
                          borderRadius: "8px",
                          overflow: "hidden",
                        }}
                      >
                        {renderFileHeader(msg)}
                        <div
                          style={{
                            padding:
                              msg.file.language === "pipeline" ||
                              msg.file.language === "dbschema"
                                ? "20px"
                                : "16px",
                            overflowX: "auto",
                          }}
                        >
                          {renderFileContent(msg)}
                        </div>
                      </div>
                    )}
                  </div>
                  {msg.options &&
                    msg.options.length > 0 &&
                    msg.role === "assistant" &&
                    (() => {
                      // Only show option buttons on last assistant message
                      const lastAssistantIdx = messages.reduce(
                        (acc, m, i) => (m.role === "assistant" ? i : acc),
                        -1,
                      );
                      const currentIdx = messages.findIndex(
                        (m) => m.id === msg.id,
                      );
                      if (currentIdx !== lastAssistantIdx) return null;
                      return (
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            marginTop: "24px",
                            flexWrap: "wrap",
                          }}
                        >
                          {msg.options.map((option, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                if (option.toLowerCase() === "modify") {
                                  setIsModifyMode(true);
                                  setMessages((prev) => [
                                    ...prev,
                                    {
                                      id: Date.now().toString(),
                                      role: "assistant",
                                      content:
                                        "Tell me what you want to change in the configuration.",
                                      timestamp: new Date().toLocaleTimeString(
                                        [],
                                        { hour: "2-digit", minute: "2-digit" },
                                      ),
                                    },
                                  ]);
                                  return;
                                }
                                handleSend(option);
                              }}
                              style={{
                                padding: "8px 16px",
                                background: "#080808",
                                border: "1px solid #333",
                                color: "#EAEAEA",
                                fontSize: "11px",
                                fontFamily: '"Geist Mono", monospace',
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                borderRadius: "4px",
                                textTransform: "uppercase",
                                fontWeight: 500,
                              }}
                              onMouseEnter={(e) => {
                                (
                                  e.currentTarget as HTMLButtonElement
                                ).style.background = "#EAEAEA";
                                (
                                  e.currentTarget as HTMLButtonElement
                                ).style.color = "#000";
                                (
                                  e.currentTarget as HTMLButtonElement
                                ).style.borderColor = "#EAEAEA";
                              }}
                              onMouseLeave={(e) => {
                                (
                                  e.currentTarget as HTMLButtonElement
                                ).style.background = "#080808";
                                (
                                  e.currentTarget as HTMLButtonElement
                                ).style.color = "#EAEAEA";
                                (
                                  e.currentTarget as HTMLButtonElement
                                ).style.borderColor = "#333";
                              }}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      );
                    })()}

                  <span
                    style={{
                      fontSize: "10px",
                      color: "#666",
                      marginTop: "16px",
                      padding: "0",
                      fontFamily: '"Geist Mono", monospace',
                    }}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              ))}
              {isTyping && (
                <div style={{ padding: "24px 0" }}>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#EAEAEA",
                      fontFamily: '"Geist Mono", monospace',
                      marginBottom: "12px",
                      letterSpacing: "1px",
                    }}
                  >
                    SYSTEM
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "4px",
                      alignItems: "center",
                      height: "24px",
                    }}
                  >
                    <div
                      style={{
                        width: "8px",
                        height: "12px",
                        background: "#EAEAEA",
                        animation: "blink 1s step-end infinite",
                      }}
                    />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} style={{ height: "40px" }} />
            </div>
          )}
        </div>

        {/* Fixed input */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,1) 60%, rgba(0,0,0,0))",
            padding: "24px 20px",
            zIndex: 10,
          }}
        >
          <div style={{ width: "100%", maxWidth: "800px", margin: "0 auto" }}>
            {renderInputArea()}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu?.visible && (
        <div
          ref={contextMenuRef}
          style={{
            position: 'fixed',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            background: '#0A0A0A',
            border: '1px solid #333',
            borderRadius: '4px',
            padding: '4px 0',
            zIndex: 1000,
            minWidth: '150px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          <button
            onClick={() => handleCopyMessage(contextMenu.messageContent)}
            style={{
              width: '100%',
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              color: '#EAEAEA',
              fontSize: '11px',
              fontFamily: '"Geist Mono", monospace',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#222';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            COPY
          </button>
          {contextMenu.messageRole === 'user' && (
            <button
              onClick={() => handleEditMessage(contextMenu.messageId, contextMenu.messageContent)}
              style={{
                width: '100%',
                padding: '8px 16px',
                background: 'transparent',
                border: 'none',
                color: '#EAEAEA',
                fontSize: '11px',
                fontFamily: '"Geist Mono", monospace',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#222';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              EDIT
            </button>
          )}
          <div style={{ height: '1px', background: '#333', margin: '4px 0' }} />
          <button
            onClick={() => handleDeleteMessage(contextMenu.messageId)}
            style={{
              width: '100%',
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              color: '#ff6b6b',
              fontSize: '11px',
              fontFamily: '"Geist Mono", monospace',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,107,107,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            DELETE
          </button>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pipDot { 0%,100%{opacity:1} 50%{opacity:.2} }
        @keyframes pipFlow { 0%{stroke-dashoffset:40} 100%{stroke-dashoffset:0} }
        @keyframes pipParticle { 0%{opacity:0;transform:translateX(0)} 50%{opacity:1} 100%{opacity:0;transform:translateX(20px)} }
        @keyframes pipPulse { 0%,100%{opacity:0.8;transform:scale(1)} 50%{opacity:1;transform:scale(1.1)} }
        @keyframes pipGlow { 0%,100%{opacity:0.3} 50%{opacity:0.8} }
        @keyframes pipFade { from{opacity:0;transform:translateY(3px)} to{opacity:1;transform:translateY(0)} }
        textarea::placeholder{color:#666}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#333;border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:#555}
      `,
        }}
      />
    </div>
  );
}
