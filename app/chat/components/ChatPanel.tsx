"use client";

import React, { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { getSessionId, resetSessionId } from "@/lib/sessionId";
import DbSchemaViewer from "@/app/chat/components/DbSchemaViewer";
import PipelineViewer from "@/app/chat/components/PipelineViewer";
import CopyButton from "@/app/chat/components/CopyButton";
import LanguageBadge from "@/app/chat/components/LanguageBadge";
import FolderStructureViewer from "@/app/chat/components/FolderStructureViewer";
import ApiDesignViewer from "@/app/chat/components/ApiDesignViewer";
import TestingPlanViewer from "@/app/chat/components/TestingPlanViewer";
import CodeRenderer from "@/app/chat/components/CodeRenderer";
import MarkdownRenderer from "@/app/chat/components/MarkdownRenderer";
import FileContentRenderer from "@/app/chat/components/FileContentRenderer";
import FileHeader from "@/app/chat/components/FileHeader";
import InputArea from "@/app/chat/components/InputArea";

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
    dbSchema?: { mermaid: string; diagram: string };
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

type ArtifactType =
  | "initial"
  | "config"
  | "docker"
  | "pipeline"
  | "markdown"
  | "folderStructure"
  | "apiDesign"
  | "testingPlan"
  | "db";

type Step =
  | "docs"
  | "config"
  | "pipeline"
  | "docker"
  | "apiDesign"
  | "db"
  | "folder"
  | "testingPlan";

// Map file language to ArtifactType for the MODIFY button
const LANG_TO_ARTIFACT: Record<string, ArtifactType> = {
  yaml: "config",
  pipeline: "pipeline",
  markdown: "markdown",
  folder: "folderStructure",
  apidesign: "apiDesign",
  testingplan: "testingPlan",
};

// Map option button label to ArtifactType
const OPTION_TO_ARTIFACT: Record<string, ArtifactType> = {
  "system config": "config",
  "show pipeline": "pipeline",
  "show docker": "docker",
  "show api design": "apiDesign",
  "view db schema": "db",
  "show folder structure": "folderStructure",
  "show testing plan": "testingPlan",
  "generate docs": "markdown",
};

export default function ChatPanel({
  agentName,
  onToggleSidebar,
  isSidebarOpen = true,
  sessionId,
  showLoginModal,
  onShowLoginModal,
}: ChatPanelProps) {
  const { isSignedIn, user } = useUser();
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

  // Modify mode
  const [modifyMode, setModifyMode] = useState(false);
  const [modifyTargetArtifact, setModifyTargetArtifact] =
    useState<ArtifactType | null>(null);

  // Token quota
  const [tokenQuota, setTokenQuota] = useState<{
    tokensUsed: number;
    tokensLimit: number;
    tokensRemaining: number;
    exhausted: boolean;
    resetAt: number;
  } | null>(null);
  const [resetCountdown, setResetCountdown] = useState<string>("");

  useEffect(() => {
    if (!tokenQuota?.exhausted || !tokenQuota.resetAt) return;
    const update = () => {
      const diff = tokenQuota.resetAt - Date.now();
      if (diff <= 0) {
        setResetCountdown("now");
        fetch("/api/token-quota")
          .then((r) => r.json())
          .then(setTokenQuota);
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setResetCountdown(
        h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`,
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [tokenQuota?.exhausted, tokenQuota?.resetAt]);

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
    if (!isSignedIn) return;
    fetch("/api/token-quota")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setTokenQuota(d));
  }, [isSignedIn]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      )
        setContextMenu(null);
    };
    if (contextMenu?.visible) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
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

  const handleDeleteMessage = (id: string) => {
    setMessages((p) => p.filter((m) => m.id !== id));
    setContextMenu(null);
  };
  const handleEditMessage = (id: string, content: string) => {
    const n = prompt("Edit message:", content);
    if (n && n !== content)
      setMessages((p) =>
        p.map((m) => (m.id === id ? { ...m, content: n } : m)),
      );
    setContextMenu(null);
  };

  // Load chat history
  useEffect(() => {
    const load = async () => {
      if (!isSignedIn) return;
      if (!sessionId) {
        setMessages([]);
        setGeneratedData(null);
        setHasGeneratedConfig(false);
        return;
      }
      setMessages([]);
      setGeneratedData(null);
      setHasGeneratedConfig(false);
      try {
        const res = await fetch(`/api/chat-history?sessionId=${sessionId}`);
        if (!res.ok) return;
        const { messages: rawAll = [] } = await res.json();

        const raw: any[] = [];
        for (const msg of rawAll) {
          const prev = raw[raw.length - 1];
          if (prev && prev.role === msg.role && prev.content === msg.content)
            continue;
          raw.push(msg);
        }

        let latestResult: any = null;
        for (const msg of raw) {
          if (msg.role === "assistant") {
            try {
              const p = JSON.parse(msg.content);
              if (p.yaml) latestResult = p;
            } catch {}
          }
        }

        const historyMessages: Message[] = [];
        let localHasConfig = false;

        for (const msg of raw) {
          const ts = new Date(
            msg.createdAt?.toDate?.() || msg.createdAt,
          ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

          if (msg.role === "user") {
            historyMessages.push({
              id: msg.id,
              role: "user",
              content: msg.content,
              timestamp: ts,
            });
            continue;
          }

          let parsed: any = null;
          try {
            parsed = JSON.parse(msg.content);
          } catch {}
          if (!parsed?.yaml) {
            historyMessages.push({
              id: msg.id,
              role: "assistant",
              content: msg.content,
              timestamp: ts,
            });
            continue;
          }

          const steps: Step[] = [
            "docs",
            "config",
            "pipeline",
            "docker",
            "apiDesign",
            "db",
            "folder",
            "testingPlan",
          ];
          const hasData = (s: Step) => {
            switch (s) {
              case "config":
                return !!parsed.yaml;
              case "docker":
                return !!parsed.docker;
              case "pipeline":
                return !!parsed.pipeline;
              case "docs":
                return !!parsed.markdown;
              case "folder":
                return !!parsed.folderStructure;
              case "db":
                return !!parsed.dbSchema;
              case "apiDesign":
                return !!parsed.apiDesign;
              case "testingPlan":
                return !!parsed.testingPlan;
              default:
                return false;
            }
          };

          for (const step of steps) {
            if (!hasData(step)) continue;
            const { content, file } = buildAssistantMessage(
              step,
              parsed,
              step === "docs" && !localHasConfig,
            );
            if (step === "config") localHasConfig = true;
            historyMessages.push({
              id: `${msg.id}-${step}`,
              role: "assistant",
              content,
              timestamp: ts,
              file,
            });
          }
        }

        setMessages(historyMessages);
        if (latestResult) {
          setGeneratedData(latestResult);
          setHasGeneratedConfig(true);
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      }
    };
    load();
  }, [sessionId, isSignedIn]);

  const buildAssistantMessage = (
    step: Step,
    data: any,
    isFirstDocs: boolean,
  ): { content: string; file: Message["file"]; options: string[] } => {
    switch (step) {
      case "config":
        return {
          content: isFirstDocs
            ? "System config generated.\nProceed to generate documentation or explore artifacts below."
            : "System config loaded.",
          file: {
            name: "system-config.yaml",
            language: "yaml",
            content: data.yaml,
          },
          options: ["Show Pipeline"],
        };
      case "docker":
        return {
          content:
            "Docker Compose configuration generated. Services, volumes, and health checks are bound.",
          file: {
            name: "docker-compose.yaml",
            language: "yaml",
            content: data.docker,
          },
          options: ["Show API Design"],
        };
      case "pipeline":
        return {
          content:
            "Pipeline architecture mapped. Displaying active data flow nodes.",
          file: {
            name: "pipeline.yaml",
            language: "pipeline",
            content: data.pipeline,
          },
          options: ["Show Docker"],
        };
      case "docs":
        return {
          content: "Project documentation generated.",
          file: {
            name: "README.md",
            language: "markdown",
            content: data.markdown,
          },
          options: ["System Config"],
        };
      case "folder":
        return {
          content: "Project folder structure generated.",
          file: {
            name: "project-structure.txt",
            language: "folder",
            content: data.folderStructure ?? "Not available.",
          },
          options: ["Show Testing Plan"],
        };
      case "apiDesign": {
        const c = data.apiDesign ?? "";
        if (!c)
          return {
            content: "API design not available.",
            file: undefined,
            options: ["View DB Schema"],
          };
        return {
          content: "API design specification generated.",
          file: { name: "api-design.yaml", language: "apidesign", content: c },
          options: ["View DB Schema"],
        };
      }
      case "testingPlan": {
        const c = data.testingPlan ?? "";
        if (!c)
          return {
            content: "Testing plan not available.",
            file: undefined,
            options: ["View DB Schema", "Show Folder Structure"],
          };
        return {
          content:
            "Testing plan generated. Unit, integration, and E2E strategy defined.",
          file: {
            name: "testing-plan.yaml",
            language: "testingplan",
            content: c,
          },
          options: ["View DB Schema", "Show Folder Structure"],
        };
      }
      case "db":
        if (!data.dbSchema)
          return {
            content:
              "ERR: DB schema not available.\n\nCheck ACTIVEPIECES_WEBHOOK_URL in .env.local.",
            file: undefined,
            options: ["Show Folder Structure"],
          };
        return {
          content: "Database schema rendered via n8n.",
          file: {
            name: "schema.er",
            language: "dbschema",
            content: data.dbSchema.diagram ?? "",
            dbSchema: {
              mermaid: data.dbSchema.mermaid ?? "",
              diagram: data.dbSchema.diagram ?? "",
            },
          },
          options: ["Show Folder Structure"],
        };
      default:
        return { content: "", file: undefined, options: [] };
    }
  };

  const optionToStep = (label: string): Step => {
    const map: Record<string, Step> = {
      "system config": "config",
      "show pipeline": "pipeline",
      "show docker": "docker",
      "show api design": "apiDesign",
      "view db schema": "db",
      "show folder structure": "folder",
      "show testing plan": "testingPlan",
      "generate docs": "docs",
    };
    return map[label.toLowerCase()] ?? "docs";
  };

  const handleSend = async (
    overrideInput?: string,
    forceArtifact?: ArtifactType,
  ) => {
    if (!isSignedIn) {
      onShowLoginModal?.(true);
      return;
    }

    if (tokenQuota?.exhausted) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `DAILY TOKEN LIMIT REACHED\n\nQuota resets in: ${resetCountdown || "< 24h"}`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
      return;
    }

    const textToSend = (overrideInput ?? input).trim();
    if (!textToSend) return;

    // Determine artifact + mode
    let artifact: ArtifactType;
    let isModify = false;

    if (forceArtifact) {
      // If no config exists yet, forceArtifact should use "initial" to avoid API error
      artifact = !hasGeneratedConfig ? "initial" : forceArtifact;
      isModify = false;
    } else if (modifyMode && modifyTargetArtifact) {
      artifact = modifyTargetArtifact;
      isModify = true;
    } else if (!hasGeneratedConfig) {
      artifact = "initial";
      isModify = false;
    } else {
      artifact = "markdown";
      isModify = false;
    }

    const currentSessionId = sessionId || resetSessionId();
    if (!sessionId) {
      window.history.replaceState(null, "", `/chat/${currentSessionId}`);
      sessionStorage.setItem('edge-os-session-id', currentSessionId);
    }

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "user",
        content: textToSend,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    if (!overrideInput) setInput("");
    setIsTyping(true);
    if (!overrideInput && textareaRef.current)
      textareaRef.current.style.height = "auto";

    // Reset modify state before fetch
    setModifyMode(false);
    setModifyTargetArtifact(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textToSend,
          sessionId: currentSessionId,
          artifact,
          mode: isModify ? "modify" : "generate",
        }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Refresh token quota
      const quotaRes = await fetch("/api/token-quota");
      if (quotaRes.ok) {
        const fresh = await quotaRes.json();
        setTokenQuota(fresh);
        const pct = fresh.tokensUsed / fresh.tokensLimit;
        if (pct >= 0.8 && !fresh.exhausted) {
          setMessages((prev) => [
            ...prev,
            {
              id: `warn-${Date.now()}`,
              role: "assistant",
              content: `TOKEN WARNING: ${fresh.tokensRemaining.toLocaleString()} tokens remaining today.`,
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
          ]);
        }
      }

      // Merge response into generatedData
      let merged: any = generatedData ? { ...generatedData } : {};

      if (data.artifact === "initial") {
        merged = { ...merged, yaml: data.yaml, markdown: data.markdown };
        setHasGeneratedConfig(true);
      } else if (isModify) {
        merged = { ...merged, yaml: data.yaml };
        const aMap: Record<string, string> = {
          docker: "docker",
          pipeline: "pipeline",
          markdown: "markdown",
          folderStructure: "folderStructure",
          apiDesign: "apiDesign",
          testingPlan: "testingPlan",
          config: "yaml",
        };
        const key = aMap[data.artifact];
        if (key) merged[key] = data.content;
      } else {
        switch (data.artifact) {
          case "config":
            merged.yaml = data.content;
            break;
          case "docker":
            merged.docker = data.content;
            break;
          case "pipeline":
            merged.pipeline = data.content;
            break;
          case "markdown":
            merged.markdown = data.content;
            break;
          case "folderStructure":
            merged.folderStructure = data.content;
            break;
          case "apiDesign":
            merged.apiDesign = data.content;
            break;
          case "testingPlan":
            merged.testingPlan = data.content;
            break;
          case "db":
            merged.dbSchema = data.dbSchema;
            break;
        }
      }

      setGeneratedData(merged);

      const artifactToStep: Record<ArtifactType, Step> = {
        initial: "docs",
        config: "config",
        docker: "docker",
        pipeline: "pipeline",
        markdown: "docs",
        folderStructure: "folder",
        apiDesign: "apiDesign",
        testingPlan: "testingPlan",
        db: "db",
      };
      const step = artifactToStep[artifact] ?? "docs";
      const { content, file, options } = buildAssistantMessage(
        step,
        merged,
        !hasGeneratedConfig,
      );

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
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `ERR: ${err instanceof Error ? err.message : "Execution failed."}`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleOptionClick = (label: string) => {
    const artifact = OPTION_TO_ARTIFACT[label.toLowerCase()] ?? "markdown";
    handleSend(label, artifact);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

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
              e.currentTarget.style.background = "#111";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#A0A0A0";
              e.currentTarget.style.borderColor = "#333";
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
            EDGE-OS
          </div>
        </div>
        {isSignedIn && (
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {tokenQuota && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  padding: "6px 12px",
                  background: tokenQuota.exhausted
                    ? "rgba(255,107,107,0.08)"
                    : "#111",
                  border: `1px solid ${tokenQuota.exhausted ? "#ff6b6b40" : "#222"}`,
                  borderRadius: "6px",
                  fontFamily: '"Geist Mono", monospace',
                  minWidth: "160px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "10px",
                    color: tokenQuota.exhausted ? "#ff6b6b" : "#666",
                    letterSpacing: "0.5px",
                  }}
                >
                  <span>{tokenQuota.exhausted ? "BURNED" : "TOKENS"}</span>
                  <span
                    style={{
                      color: tokenQuota.exhausted ? "#ff6b6b" : "#A0A0A0",
                    }}
                  >
                    {tokenQuota.tokensUsed.toLocaleString()} /{" "}
                    {tokenQuota.tokensLimit.toLocaleString()}
                  </span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "2px",
                    background: "#1A1A1A",
                    borderRadius: "2px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min((tokenQuota.tokensUsed / tokenQuota.tokensLimit) * 100, 100)}%`,
                      background: tokenQuota.exhausted
                        ? "#ff6b6b"
                        : tokenQuota.tokensUsed / tokenQuota.tokensLimit > 0.8
                          ? "#FBBF24"
                          : "#34D399",
                      borderRadius: "2px",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
            )}
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
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: "200px" }}>
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
                ].map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(p.text)}
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
                        textTransform: "uppercase",
                      }}
                    >
                      <span style={{ color: "#666", marginRight: "8px" }}>
                        &gt;
                      </span>
                      {p.title}
                    </div>
                    <div
                      style={{
                        color: "#888",
                        fontSize: "13px",
                        lineHeight: "1.6",
                      }}
                    >
                      {p.desc}
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
                    {msg.role === "user"
                      ? (user?.firstName && user?.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user?.firstName || user?.lastName || "USER"
                        ).toUpperCase()
                      : "SYSTEM"}
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
                      {msg.tools.map((t) => (
                        <span
                          key={t}
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
                          {t}
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
                        <FileHeader
                          msg={msg}
                          markdownMode={markdownMode}
                          setMarkdownMode={setMarkdownMode}
                        />
                        <div
                          style={{
                            padding:
                              msg.file.language === "pipeline" ||
                              msg.file.language === "dbschema" ||
                              msg.file.language === "apidesign" ||
                              msg.file.language === "testingplan"
                                ? "20px"
                                : "16px",
                            overflowX: "auto",
                          }}
                        >
                          <FileContentRenderer
                            msg={msg}
                            markdownMode={markdownMode}
                            activePipelineNodes={activePipelineNodes}
                            setActivePipelineNodes={setActivePipelineNodes}
                          />
                        </div>
                        {/* MODIFY button — all artifacts except db */}
                        {msg.role === "assistant" &&
                          msg.file.language !== "dbschema" && (
                            <div
                              style={{
                                padding: "10px 16px",
                                borderTop: "1px solid #1A1A1A",
                                display: "flex",
                                justifyContent: "flex-end",
                              }}
                            >
                              <button
                                onClick={() => {
                                  const target =
                                    LANG_TO_ARTIFACT[msg.file!.language] ??
                                    "config";
                                  setModifyMode(true);
                                  setModifyTargetArtifact(target);
                                  textareaRef.current?.focus();
                                }}
                                style={{
                                  padding: "5px 14px",
                                  background: "transparent",
                                  border: "1px solid #333",
                                  color: "#666",
                                  fontSize: "10px",
                                  fontFamily: '"Geist Mono", monospace',
                                  cursor: "pointer",
                                  borderRadius: "4px",
                                  letterSpacing: "0.5px",
                                  textTransform: "uppercase",
                                  transition: "all 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = "#FBBF24";
                                  e.currentTarget.style.color = "#FBBF24";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = "#333";
                                  e.currentTarget.style.color = "#666";
                                }}
                              >
                                MODIFY
                              </button>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                  {msg.options &&
                    msg.options.length > 0 &&
                    msg.role === "assistant" && (
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          marginTop: "24px",
                          flexWrap: "wrap",
                        }}
                      >
                        {msg.options.map((option, i) => {
                          const isClicked = messages.some(
                            (m) => m.role === "user" && m.content === option,
                          );
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                if (!isClicked) handleOptionClick(option);
                              }}
                              style={{
                                padding: "8px 16px",
                                background: isClicked
                                  ? "transparent"
                                  : "#080808",
                                border: `1px solid ${isClicked ? "#222" : "#333"}`,
                                color: isClicked ? "#555" : "#EAEAEA",
                                fontSize: "11px",
                                fontFamily: '"Geist Mono", monospace',
                                cursor: isClicked ? "default" : "pointer",
                                transition: "all 0.2s ease",
                                borderRadius: "4px",
                                textTransform: "uppercase",
                                fontWeight: 500,
                                opacity: isClicked ? 0.7 : 1,
                              }}
                              onMouseEnter={(e) => {
                                if (!isClicked) {
                                  (
                                    e.currentTarget as HTMLButtonElement
                                  ).style.background = "#EAEAEA";
                                  (
                                    e.currentTarget as HTMLButtonElement
                                  ).style.color = "#000";
                                  (
                                    e.currentTarget as HTMLButtonElement
                                  ).style.borderColor = "#EAEAEA";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isClicked) {
                                  (
                                    e.currentTarget as HTMLButtonElement
                                  ).style.background = "#080808";
                                  (
                                    e.currentTarget as HTMLButtonElement
                                  ).style.color = "#EAEAEA";
                                  (
                                    e.currentTarget as HTMLButtonElement
                                  ).style.borderColor = "#333";
                                }
                              }}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#666",
                      marginTop: "16px",
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
            {/* MODIFY MODE banner */}
            {modifyMode && modifyTargetArtifact && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "10px",
                  padding: "8px 14px",
                  border: "1px solid #FBBF2440",
                  borderRadius: "6px",
                  background: "rgba(251,191,36,0.04)",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    fontFamily: '"Geist Mono", monospace',
                    color: "#FBBF24",
                    letterSpacing: "0.5px",
                    fontWeight: 600,
                  }}
                >
                  MODIFY MODE
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontFamily: '"Geist Mono", monospace',
                    color: "#555",
                    letterSpacing: "0.5px",
                  }}
                >
                  Targeting: {modifyTargetArtifact.toUpperCase()}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontFamily: '"Geist Mono", monospace',
                    color: "#444",
                    flex: 1,
                  }}
                >
                  Only this artifact will regenerate
                </span>
                <button
                  onClick={() => {
                    setModifyMode(false);
                    setModifyTargetArtifact(null);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#555",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontFamily: '"Geist Mono", monospace',
                    padding: "0 4px",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#EAEAEA";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#555";
                  }}
                >
                  x CANCEL
                </button>
              </div>
            )}
            <InputArea
              input={input}
              textareaRef={textareaRef}
              tokenQuota={tokenQuota}
              handleInputChange={handleInputChange}
              handleKeyDown={handleKeyDown}
              handleSend={handleSend}
              isTyping={isTyping}
            />
          </div>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu?.visible && (
        <div
          ref={contextMenuRef}
          style={{
            position: "fixed",
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            background: "#0A0A0A",
            border: "1px solid #333",
            borderRadius: "4px",
            padding: "4px 0",
            zIndex: 1000,
            minWidth: "150px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          <button
            onClick={() => handleCopyMessage(contextMenu.messageContent)}
            style={{
              width: "100%",
              padding: "8px 16px",
              background: "transparent",
              border: "none",
              color: "#EAEAEA",
              fontSize: "11px",
              fontFamily: '"Geist Mono", monospace',
              textAlign: "left",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#222";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            COPY
          </button>
          {contextMenu.messageRole === "user" && (
            <button
              onClick={() =>
                handleEditMessage(
                  contextMenu.messageId,
                  contextMenu.messageContent,
                )
              }
              style={{
                width: "100%",
                padding: "8px 16px",
                background: "transparent",
                border: "none",
                color: "#EAEAEA",
                fontSize: "11px",
                fontFamily: '"Geist Mono", monospace',
                textAlign: "left",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#222";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              EDIT
            </button>
          )}
          <div style={{ height: "1px", background: "#333", margin: "4px 0" }} />
          <button
            onClick={() => handleDeleteMessage(contextMenu.messageId)}
            style={{
              width: "100%",
              padding: "8px 16px",
              background: "transparent",
              border: "none",
              color: "#ff6b6b",
              fontSize: "11px",
              fontFamily: '"Geist Mono", monospace',
              textAlign: "left",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,107,107,0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
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
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
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
