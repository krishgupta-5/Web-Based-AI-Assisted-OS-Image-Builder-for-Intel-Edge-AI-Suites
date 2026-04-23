/**
 * /api/generate/route.ts
 * Edge-OS — Per-artifact generation with individual API keys.
 *
 * NEW ARCHITECTURE:
 *  - artifact: "initial"         → YAML (silent) + Markdown shown in UI
 *  - artifact: "config"          → YAML config only
 *  - artifact: "docker"          → docker-compose only
 *  - artifact: "pipeline"        → pipeline only
 *  - artifact: "folderStructure" → folder structure only
 *  - artifact: "apiDesign"       → API design only
 *  - artifact: "testingPlan"     → testing plan only
 *  - artifact: "db"              → n8n webhook only
 *
 *  mode: "modify" + artifact → regenerates only that artifact using session context
 *
 * ENV KEYS (add these to .env.local):
 *  GROQ_API_KEY                  ← fallback (required)
 *  GROQ_API_KEY_CONFIG           ← new
 *  GROQ_API_KEY_DOCKER           ← new
 *  GROQ_API_KEY_PIPELINE         ← new
 *  GROQ_API_KEY_MARKDOWN         ← already existed
 *  GROQ_API_KEY_FOLDERSTRUCTURE  ← already existed
 *  GROQ_API_KEY_APIDESIGN        ← already existed
 *  GROQ_API_KEY_TESTINGPLAN      ← new
 */

import { NextResponse } from "next/server";
import YAML from "yaml";
import { auth } from "@clerk/nextjs/server";
import { memoryStore } from "@/lib/memory-store";
import { db, createOrUpdateUser } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getOrCreateQuota, deductTokens } from "@/lib/token-quota";
import { getFullUserData } from "@/lib/auth";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const MODEL = "llama-3.1-8b-instant";
const MAX_RETRIES = 3;
const MAX_HISTORY = 6;
const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_SESSIONS = 500;
const PROMPT_MAX_LEN = 2000;
const PROMPT_MIN_LEN = 5;
const REQUEST_TIMEOUT_MS = 30_000;
const ACTIVEPIECES_TIMEOUT_MS = 45_000;

const TOKEN_BUDGET = {
  config: 500,
  docker: 1200,
  pipeline: 600,
  markdown: 3000,
  folderStructure: 600,
  apiDesign: 800,
  testingPlan: 700,
} as const;

const IMAGE_MAP_TEXT = `
  postgresql -> postgres:15-alpine
  mongodb    -> mongo:7
  mysql      -> mysql:8
  redis      -> redis:7-alpine
  sqlite     -> keinos/sqlite3:latest
  nodejs     -> node:20-alpine
  python     -> python:3.11-slim
  go         -> golang:1.22-alpine`.trim();

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
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

interface DbSchema {
  mermaid: string;
  diagram: string;
}

interface GenerateResult {
  yaml: string;
  markdown: string;
  docker: string;
  pipeline: string;
  folderStructure?: string;
  apiDesign?: string;
  testingPlan?: string;
  dbSchema?: DbSchema;
}

type Role = "user" | "assistant";
type HistoryMsg = { role: Role; content: string };

interface SessionData {
  history: HistoryMsg[];
  lastResult: GenerateResult | null;
  cache: Map<string, GenerateResult>;
  updatedAt: number;
}

// ─────────────────────────────────────────────
// Logger
// ─────────────────────────────────────────────
const log = {
  info: (msg: string, meta?: object, key?: string) =>
    console.log(
      JSON.stringify({
        level: "info",
        msg,
        ...meta,
        key: key?.slice(0, 8),
        ts: Date.now(),
      }),
    ),
  warn: (msg: string, meta?: object, key?: string) =>
    console.warn(
      JSON.stringify({
        level: "warn",
        msg,
        ...meta,
        key: key?.slice(0, 8),
        ts: Date.now(),
      }),
    ),
  error: (msg: string, meta?: object, key?: string) =>
    console.error(
      JSON.stringify({
        level: "error",
        msg,
        ...meta,
        key: key?.slice(0, 8),
        ts: Date.now(),
      }),
    ),
};

// ─────────────────────────────────────────────
// LRU Session store
// ─────────────────────────────────────────────
const sessions = new Map<string, SessionData>();

function getSession(id: string): SessionData {
  const now = Date.now();
  if (sessions.size >= MAX_SESSIONS) {
    for (const [k, v] of sessions)
      if (now - v.updatedAt > SESSION_TTL_MS) sessions.delete(k);
    if (sessions.size >= MAX_SESSIONS) {
      const oldest = [...sessions.entries()].sort(
        (a, b) => a[1].updatedAt - b[1].updatedAt,
      )[0];
      if (oldest) sessions.delete(oldest[0]);
    }
  }
  let s = sessions.get(id);
  if (!s || now - s.updatedAt > SESSION_TTL_MS) {
    s = { history: [], lastResult: null, cache: new Map(), updatedAt: now };
    sessions.set(id, s);
  } else {
    s.updatedAt = now;
  }
  return s;
}

function trimHistory(h: HistoryMsg[]): HistoryMsg[] {
  return h.slice(-MAX_HISTORY);
}

// ─────────────────────────────────────────────
// YAML helpers
// ─────────────────────────────────────────────
function summarizeYaml(yamlText: string): string {
  const get = (key: string) =>
    new RegExp(`${key}:\\s*(.+)`).exec(yamlText)?.[1]?.trim() ?? "unknown";
  return [
    `name:${get("name")}`,
    `type:${get("type")}`,
    `arch:${get("architecture")}`,
    `lang:${get("language")}`,
    `framework:${get("framework")}`,
    `api:${get("api")}`,
    `db:${get("primary")}`,
    `cache:${get("cache")}`,
    `auth:${get("strategy")}`,
    `deploy:${get("deployment")}`,
    `ci:${get("ci_cd")}`,
  ].join(", ");
}

function compressForHistory(content: string, label: string): string {
  if (label === "config") return `PREV_CONFIG: ${summarizeYaml(content)}`;
  return `PREV_${label.toUpperCase()}: ${content.replace(/\s+/g, " ").trim().slice(0, 100)}...`;
}

function extractYamlBlock(text: string): string {
  const lines = text.split("\n");
  const keys =
    /^(system|backend|frontend|database|auth|infra|pipeline|version|services|api_design|testing):/;
  const start = lines.findIndex((l) => keys.test(l.trim()));
  return start >= 0 ? lines.slice(start).join("\n").trim() : text.trim();
}

function isTruncated(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const lines = trimmed.split("\n");
  if (lines.length < 5) return true;
  const last = lines[lines.length - 1].trim();
  const safe = [
    /^[a-z_]+:$/,
    /^\s*retries:\s*\d+$/,
    /^\s*timeout:\s*\S+$/,
    /^\s*interval:\s*\S+$/,
    /^\s*- \S+/,
    /^\s*volumes:$/,
    /^\s*depends_on:$/,
  ];
  if (safe.some((re) => re.test(last))) return false;
  if (/^[a-zA-Z_-]+:$/.test(last) && lines.length < 20) return true;
  if (last === "-") return true;
  return false;
}

function safeYaml(text: string): string {
  try {
    YAML.parse(text);
  } catch {
    log.warn("YAML parse warning");
  }
  return text;
}

function stripFences(text: string): string {
  return text
    .replace(/^```(?:yaml|yml|json|markdown|md|dockerfile)?\s*/gim, "")
    .replace(/^```\s*/gim, "")
    .replace(/```\s*$/gim, "")
    .trim();
}

function sanitisePrompt(raw: string): string {
  return raw
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\bPREV_[A-Z]+:/g, "")
    .trim()
    .slice(0, PROMPT_MAX_LEN);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error(`Timeout ${ms}ms`)), ms),
    ),
  ]);
}

function secureHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

function errorResponse(
  error: string,
  code: string,
  status: number,
): NextResponse {
  return secureHeaders(NextResponse.json({ error, code }, { status }));
}

// ─────────────────────────────────────────────
// API key resolver — one key per artifact
// ─────────────────────────────────────────────
function getApiKey(artifact: ArtifactType, fallback: string): string {
  const map: Partial<Record<ArtifactType, string | undefined>> = {
    config: process.env.GROQ_API_KEY_CONFIG,
    docker: process.env.GROQ_API_KEY_DOCKER,
    pipeline: process.env.GROQ_API_KEY_PIPELINE,
    markdown: process.env.GROQ_API_KEY_MARKDOWN,
    folderStructure: process.env.GROQ_API_KEY_FOLDERSTRUCTURE,
    apiDesign: process.env.GROQ_API_KEY_APIDESIGN,
    testingPlan: process.env.GROQ_API_KEY_TESTINGPLAN,
    initial: process.env.GROQ_API_KEY_CONFIG,
  };
  return map[artifact] || fallback;
}

// ─────────────────────────────────────────────
// PROMPTS
// ─────────────────────────────────────────────
const SOFTWARE_CONFIG_PROMPT = `You are a software architect. Output ONLY valid YAML matching the exact structure below. No prose, no fences, no comments.

system:
  name: <kebab-case-name>
  type: <web-app|saas|api|microservices|ai-app>
  architecture: <monolith|microservices|serverless>
backend:
  language: <nodejs|python|go>
  framework: <express|fastapi|nestjs|gin|fiber>
  api: <rest|graphql|grpc>
  port: <number>
frontend:
  framework: <react|nextjs|vue|none>
  port: <number>
database:
  primary: <postgresql|mongodb|mysql|redis|sqlite>
  cache: <redis|memcached|none>
auth:
  strategy: <jwt|oauth2|session|none>
infra:
  deployment: <docker|kubernetes|serverless>
  ci_cd: <github-actions|gitlab-ci|none>

RULES:
- Output ONLY the YAML block. Nothing before or after it.
- All values must be concrete strings or numbers — never null or empty.
- Infer sensible production defaults from the user description.
- Lines starting with PREV_ are previous context metadata — do NOT copy them into your output.
- Do NOT add any keys that are not in the structure above.`;

const DOCKER_PROMPT = `You are a DevOps engineer. Output ONLY a valid docker-compose.yaml. No prose, no markdown fences.

IMAGE MAP — use these exact images based on the db and lang fields in the stack summary:
${IMAGE_MAP_TEXT}

RULES:
- version: "3.8"
- Services: backend service + primary database service only.
- CRITICAL: The database image MUST exactly match the db field in the stack summary.
- Backend image must match the lang field.
- Add environment variables relevant to the stack.
- Add named volumes and depends_on for the database.
- Add a healthcheck for the database service.
- Expose the correct ports (from the stack summary).
- Output raw YAML only. No prose before or after.
- Always end the file with the named volumes block.
- IMPORTANT: Always complete the entire file — never stop mid-block.`;

const PIPELINE_PROMPT = `You are a software architect. Output ONLY valid YAML for a CI/CD pipeline. No prose, no fences.

Output this exact structure:
pipeline:
  name: <system-name from stack>
  version: "1.0.0"
  trigger: <continuous|on-request|scheduled>
  steps:
    - id: ingest
      title: <specific label for this system>
      type: source
      description: <one sentence specific to this system>
    - id: process
      title: <specific label>
      type: transform
      description: <one sentence>
    - id: store
      title: <specific label>
      type: storage
      description: <one sentence>
    - id: respond
      title: <specific label>
      type: output
      description: <one sentence>
  flow: "ingest -> process -> store -> respond"

RULES:
- Match step titles exactly to the system described.
- name must match the system name in the stack summary.
- Lines starting with PREV_ are context metadata — do NOT copy them.
- Output ONLY the YAML block. Nothing else.`;

const MARKDOWN_PROMPT = `You are a senior software architect writing comprehensive project documentation. Output raw Markdown only — do NOT wrap in a code fence. No emoji anywhere.

Write ALL sections in order, specific to the system described:

# <Project Name>
---
## Overview
## Problem Statement
## Solution
## Requirements
### Functional Requirements
### Non-Functional Requirements
## User Stories
## Features
## Architecture
### Architecture Pattern
### System Flow
### Module Breakdown
## Tech Stack
### Frontend
### Backend
### Database
### DevOps and Deployment
## Auth Plan
## Security Plan
## Performance Plan
## Testing Plan
## Roadmap
### Phase 1
### Phase 2
### Phase 3
## DevOps and CI/CD
## Scalability Plan
## Limitations
## Future Scope
---

RULES:
- No emoji anywhere. Plain ASCII only.
- Every section must be specific to this system.
- Lines starting with PREV_ are context metadata — do NOT copy them.
- Always complete the entire document.`;

const FOLDER_STRUCTURE_PROMPT = `You are a senior software engineer. Given a stack summary, output ONLY a plain-text ASCII folder/file tree. No prose, no fences.

RULES:
- Root folder name matches the system name from the stack summary.
- Include folders/files for the lang/framework in the stack summary.
- nodejs/express: src/, controllers/, models/, routes/, middleware/, index.js
- python/fastapi: app/, routers/, models/, schemas/, main.py, requirements.txt
- go/gin or go/fiber: cmd/, internal/, handlers/, models/, main.go, go.mod
- Always include: docker-compose.yaml, Dockerfile, .env.example, README.md
- Include CI config if ci_cd is not "none"
- Include tests/ or __tests__/
- Output ONLY the tree.`;

const API_DESIGN_PROMPT = `You are a senior backend engineer. Given a stack summary, output ONLY a valid YAML document describing the API design. No prose, no fences.

api_design:
  base_url: /api/v1
  auth_header: <e.g. Authorization: Bearer <token> | none>
  format: <json|graphql|grpc>
  endpoints:
    - group: <resource group>
      routes:
        - method: <GET|POST|PUT|PATCH|DELETE>
          path: <path>
          description: <one sentence>
          auth_required: <true|false>
          request_body: <brief or "none">
          response: <brief>

RULES:
- 3-5 resource groups relevant to the system.
- Each group: 2-4 routes.
- Output ONLY the YAML block.`;

const TESTING_PLAN_PROMPT = `You are a senior QA engineer. Given a stack summary, output ONLY a valid YAML testing plan. No prose, no fences.

testing:
  strategy: <1-sentence>
  coverage_target: <e.g. 80%>
  unit:
    framework: <Jest|pytest|Go testing>
    focus:
      - <module>
    mocking: <brief>
  integration:
    framework: <Supertest|pytest-httpx|httptest>
    focus:
      - <scenario>
    test_db: <brief>
  e2e:
    framework: <Playwright|Cypress|none>
    scenarios:
      - <flow>
  ci:
    run_on: <e.g. every pull request>
    parallel: <true|false>
    fail_fast: <true|false>

RULES:
- Frameworks must match the lang/framework in the stack summary.
- Output ONLY the YAML block.`;

const TITLE_PROMPT = `Summarize the user's prompt into a concise 3-4 word title. Respond ONLY with the title. No quotes, no preamble.`;

// ─────────────────────────────────────────────
// Firestore helpers
// ─────────────────────────────────────────────
async function saveUserMessage(sid: string, uid: string, content: string) {
  await db
    .collection("sessions")
    .doc(sid)
    .collection("messages")
    .add({ role: "user", content, userId: uid, createdAt: new Date() });
}

async function saveAssistantMessage(sid: string, uid: string, content: string) {
  await db
    .collection("sessions")
    .doc(sid)
    .collection("messages")
    .add({ role: "assistant", content, userId: uid, createdAt: new Date() });
}

async function saveArtifact(
  sid: string,
  uid: string,
  type: string,
  content: string,
) {
  await db
    .collection("sessions")
    .doc(sid)
    .collection("artifacts")
    .add({ type, content, userId: uid, createdAt: new Date() });
}

async function saveSessionMetadata(sid: string, uid: string, title?: string) {
  const data: any = { userId: uid, updatedAt: new Date() };
  if (title) data.title = title;
  await db.collection("sessions").doc(sid).set(data, { merge: true });
}

// ─────────────────────────────────────────────
// n8n / Activepieces DB schema
// ─────────────────────────────────────────────
async function callN8nDbDesign(
  prompt: string,
  stackSummary: string,
): Promise<DbSchema | null> {
  const webhookUrl = process.env.ACTIVEPIECES_WEBHOOK_URL;
  if (!webhookUrl) {
    log.warn("ACTIVEPIECES_WEBHOOK_URL not set");
    return null;
  }
  try {
    const res = await withTimeout(
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, stackSummary }),
      }),
      ACTIVEPIECES_TIMEOUT_MS,
    );
    if (!res.ok) {
      log.error("Activepieces error", { status: res.status });
      return null;
    }
    const text = await res.text();
    const clean = text.trimStart().startsWith("=")
      ? text.trimStart().slice(1)
      : text;
    let data: any;
    try {
      data = JSON.parse(clean);
    } catch {
      log.error("Activepieces not JSON");
      return null;
    }
    const p = Array.isArray(data) ? data[0] : data;
    const mermaid = p?.mermaid ?? p?.schema ?? p?.erd ?? p?.text ?? "";
    const diagram =
      p?.diagram ?? p?.svg ?? p?.image ?? p?.url ?? p?.output ?? "";
    if (!mermaid && !diagram) {
      log.warn("Activepieces empty payload");
      return null;
    }
    return { mermaid, diagram };
  } catch (err) {
    log.error("Activepieces call failed", { err: String(err) });
    return null;
  }
}

// ─────────────────────────────────────────────
// Groq helpers
// ─────────────────────────────────────────────
async function callGroq(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  history: HistoryMsg[],
  maxTokens: number,
  label: string,
  attempt0 = 0,
): Promise<{ content: string; tokens: number } | null> {
  const temperature = label === "markdown" ? 0.3 : 0.1;
  const stopTokens = label === "config" || label === "docker" ? ["```"] : [];

  for (let attempt = attempt0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await withTimeout(
        fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              { role: "system", content: systemPrompt },
              ...history,
              { role: "user", content: userMessage },
            ],
            temperature,
            max_tokens: maxTokens,
            top_p: 0.9,
            ...(stopTokens.length ? { stop: stopTokens } : {}),
          }),
        }),
        REQUEST_TIMEOUT_MS,
      );

      if (res.status === 429) {
        const wait =
          parseFloat(res.headers.get("retry-after") ?? "") * 1000 ||
          Math.pow(2, attempt) * 3000;
        log.warn("Rate limited", { label, attempt, wait }, apiKey);
        if (attempt < MAX_RETRIES) {
          await sleep(wait);
          continue;
        }
        return null;
      }
      if (!res.ok) {
        log.error("Groq error", { label, status: res.status }, apiKey);
        return null;
      }

      const data = await res.json();
      const raw = data?.choices?.[0]?.message?.content ?? "";
      const cleaned = extractYamlBlock(stripFences(raw));
      const tokens = data?.usage?.total_tokens ?? 0;

      if (isTruncated(cleaned) && attempt < MAX_RETRIES) {
        log.warn("Truncated, retrying", { label, attempt }, apiKey);
        return callGroq(
          apiKey,
          systemPrompt,
          userMessage,
          history,
          Math.ceil(maxTokens * 1.25),
          label,
          attempt + 1,
        );
      }

      log.info("Groq OK", { label, tokens }, apiKey);
      return { content: cleaned, tokens };
    } catch (err) {
      log.error(
        "Groq fetch error",
        { label, attempt, err: String(err) },
        apiKey,
      );
      if (attempt < MAX_RETRIES) {
        await sleep(Math.pow(2, attempt) * 2000);
        continue;
      }
      return null;
    }
  }
  return null;
}

async function callGroqRaw(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  history: HistoryMsg[],
  maxTokens: number,
  label: string,
): Promise<{ content: string; tokens: number } | null> {
  try {
    const res = await withTimeout(
      fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: userMessage },
          ],
          temperature: label === "markdown" ? 0.3 : 0.1,
          max_tokens: maxTokens,
          top_p: 0.9,
        }),
      }),
      REQUEST_TIMEOUT_MS,
    );
    if (!res.ok) {
      log.error("Groq raw error", { label, status: res.status }, apiKey);
      return null;
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    const tokens = data?.usage?.total_tokens ?? 0;
    log.info("Groq raw OK", { label, tokens }, apiKey);
    return { content, tokens };
  } catch (err) {
    log.error("Groq raw error", { label, err: String(err) }, apiKey);
    return null;
  }
}

// ─────────────────────────────────────────────
// POST handler
// ─────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const fullUserData = await getFullUserData();
    await createOrUpdateUser(userId, fullUserData);

    const quota = await getOrCreateQuota(userId);
    if (quota.exhausted || quota.tokensUsed >= quota.tokensLimit)
      return errorResponse(
        "Daily token limit reached.",
        "TOKEN_EXHAUSTED",
        429,
      );

    // ── Parse body ───────────────────────────────────────────────────────────
    let body: {
      prompt?: unknown;
      mode?: unknown;
      sessionId?: unknown;
      artifact?: unknown;
    };
    try {
      body = await req.json();
      log.info("Request body parsed", { bodyKeys: Object.keys(body) });
    } catch (error) {
      log.error("JSON parsing failed", { error: error instanceof Error ? error.message : String(error) });
      return errorResponse("Invalid JSON body", "BAD_REQUEST", 400);
    }

    const rawPrompt = typeof body.prompt === "string" ? body.prompt : "";
    const mode = typeof body.mode === "string" ? body.mode : "generate";
    const rawSid = typeof body.sessionId === "string" ? body.sessionId : "";
    const artifact = (
      typeof body.artifact === "string" ? body.artifact : "initial"
    ) as ArtifactType;

    // Log request details for debugging
    log.info("Request details", {
      userId,
      rawPrompt: rawPrompt.substring(0, 100),
      rawPromptLength: rawPrompt.length,
      mode,
      rawSid,
      artifact,
    });

    const sessionId = rawSid.trim() || `anon-${Date.now()}`;
    const prompt = sanitisePrompt(rawPrompt);

    log.info("After sanitization", {
      promptLength: prompt.length,
      prompt: prompt.substring(0, 100),
      PROMPT_MIN_LEN,
    });

    if (!prompt || prompt.length < PROMPT_MIN_LEN) {
      const errorMsg = prompt ? "Prompt too short (min 5 chars)" : "Prompt is required";
      const errorCode = prompt ? "PROMPT_TOO_SHORT" : "MISSING_PROMPT";
      log.error("Validation failed", { errorMsg, promptLength: prompt.length });
      return errorResponse(errorMsg, errorCode, 400);
    }

    // ── API key ──────────────────────────────────────────────────────────────
    const fallback = process.env.GROQ_API_KEY;
    if (!fallback)
      return errorResponse("Server misconfiguration", "MISSING_API_KEY", 500);

    // ── Session ──────────────────────────────────────────────────────────────
    const session = getSession(sessionId);
    
    // Rehydrate lastResult from Firestore if empty (cold start recovery)
    if (!session.lastResult) {
      const snap = await db
        .collection("sessions")
        .doc(sessionId)
        .collection("artifacts")
        .where("type", "==", "config")
        .get();
      if (!snap.empty) {
        const yaml = snap.docs[snap.docs.length - 1].data().content;
        session.lastResult = { yaml, markdown: "", docker: "", pipeline: "" };
      }
    }
    
    const history = trimHistory(session.history);
    const isFirstMessage = session.history.length === 0;

    // ── Save user message ────────────────────────────────────────────────────
    await saveUserMessage(sessionId, userId, prompt);
    await memoryStore.addMessage(sessionId, {
      role: "user",
      content: prompt,
      userId,
    });
    await memoryStore.updateSession(sessionId, { userId });

    // ── Session title (first message only) ───────────────────────────────────
    let generatedTitle: string | undefined;
    if (isFirstMessage) {
      const titleRes = await callGroqRaw(
        getApiKey("config", fallback),
        TITLE_PROMPT,
        prompt,
        [],
        15,
        "title",
      );
      if (titleRes?.content)
        generatedTitle = titleRes.content.replace(/["']/g, "").trim();
    }

    
    // ══════════════════════════════════════════════════════════════════════════
    // MODIFY MODE — regenerates only the requested artifact
    // ══════════════════════════════════════════════════════════════════════════
    if (mode === "modify" && session.lastResult) {
      const oldYaml = session.lastResult.yaml;
      const configKey = getApiKey("config", fallback);
      const userMessage = `PREV_CONFIG: ${summarizeYaml(oldYaml)}\n\nRequested changes: ${prompt}`;

      // Always re-derive YAML first so detectChanges knows what shifted
      const configResult = await callGroq(
        configKey,
        SOFTWARE_CONFIG_PROMPT,
        userMessage,
        history,
        TOKEN_BUDGET.config,
        "config",
      );
      if (!configResult)
        return errorResponse("Config regeneration failed", "LLM_ERROR", 500);
      const newYaml = configResult.content;

      session.history.push({ role: "user", content: userMessage });
      session.history.push({
        role: "assistant",
        content: compressForHistory(newYaml, "config"),
      });

      const stackSummary = summarizeYaml(newYaml);
      let updatedContent = "";
      let tokensUsed = configResult.tokens;

      // Regenerate only the artifact the user asked to modify
      switch (artifact) {
        case "docker": {
          const r = await callGroq(
            getApiKey("docker", fallback),
            DOCKER_PROMPT,
            `Generate docker-compose for UPDATED stack: ${stackSummary}`,
            trimHistory(session.history),
            TOKEN_BUDGET.docker,
            "docker",
          );
          if (r) {
            updatedContent = r.content;
            tokensUsed += r.tokens;
          }
          break;
        }
        case "pipeline": {
          const r = await callGroq(
            getApiKey("pipeline", fallback),
            PIPELINE_PROMPT,
            `Generate pipeline for UPDATED system: ${stackSummary}`,
            trimHistory(session.history),
            TOKEN_BUDGET.pipeline,
            "pipeline",
          );
          if (r) {
            updatedContent = r.content;
            tokensUsed += r.tokens;
          }
          break;
        }
        case "markdown": {
          const r = await callGroqRaw(
            getApiKey("markdown", fallback),
            MARKDOWN_PROMPT,
            `Project (updated): ${prompt}\nStack summary: ${stackSummary}`,
            trimHistory(session.history),
            TOKEN_BUDGET.markdown,
            "markdown",
          );
          if (r) {
            updatedContent = r.content;
            tokensUsed += r.tokens;
          }
          break;
        }
        case "folderStructure": {
          const r = await callGroq(
            getApiKey("folderStructure", fallback),
            FOLDER_STRUCTURE_PROMPT,
            `Generate folder structure for UPDATED stack: ${stackSummary}`,
            trimHistory(session.history),
            TOKEN_BUDGET.folderStructure,
            "folderStructure",
          );
          if (r) {
            updatedContent = r.content;
            tokensUsed += r.tokens;
          }
          break;
        }
        case "apiDesign": {
          const r = await callGroq(
            getApiKey("apiDesign", fallback),
            API_DESIGN_PROMPT,
            `Generate API design for UPDATED stack: ${stackSummary}`,
            trimHistory(session.history),
            TOKEN_BUDGET.apiDesign,
            "apiDesign",
          );
          if (r) {
            updatedContent = r.content;
            tokensUsed += r.tokens;
          }
          break;
        }
        case "testingPlan": {
          const r = await callGroq(
            getApiKey("testingPlan", fallback),
            TESTING_PLAN_PROMPT,
            `Generate testing plan for UPDATED stack: ${stackSummary}`,
            trimHistory(session.history),
            TOKEN_BUDGET.testingPlan,
            "testingPlan",
          );
          if (r) {
            updatedContent = r.content;
            tokensUsed += r.tokens;
          }
          break;
        }
        case "config":
        default:
          updatedContent = newYaml;
          break;
      }

      await deductTokens(userId, tokensUsed);

      // Merge updated artifact back into lastResult
      const updated: GenerateResult = {
        ...session.lastResult,
        yaml: safeYaml(newYaml),
        ...(artifact === "docker" && updatedContent
          ? { docker: safeYaml(updatedContent) }
          : {}),
        ...(artifact === "pipeline" && updatedContent
          ? { pipeline: updatedContent }
          : {}),
        ...(artifact === "markdown" && updatedContent
          ? { markdown: updatedContent }
          : {}),
        ...(artifact === "folderStructure" && updatedContent
          ? { folderStructure: updatedContent }
          : {}),
        ...(artifact === "apiDesign" && updatedContent
          ? { apiDesign: updatedContent }
          : {}),
        ...(artifact === "testingPlan" && updatedContent
          ? { testingPlan: updatedContent }
          : {}),
      };
      session.lastResult = updated;

      await saveAssistantMessage(sessionId, userId, JSON.stringify(updated));
      await memoryStore.addMessage(sessionId, {
        role: "assistant",
        content: JSON.stringify(updated),
        userId,
      });
      await saveArtifact(
        sessionId,
        userId,
        artifact,
        updatedContent || newYaml,
      );
      await memoryStore.addArtifact(sessionId, {
        type: artifact,
        content: updatedContent || newYaml,
        userId,
      });
      await saveSessionMetadata(sessionId, userId, generatedTitle);
      await memoryStore.updateSession(sessionId, {
        userId,
        ...(generatedTitle && { title: generatedTitle }),
      });

      // Return only the updated artifact + refreshed yaml
      return secureHeaders(
        NextResponse.json({
          artifact,
          yaml: updated.yaml,
          ...(artifact === "docker" ? { content: updated.docker } : {}),
          ...(artifact === "pipeline" ? { content: updated.pipeline } : {}),
          ...(artifact === "markdown" ? { content: updated.markdown } : {}),
          ...(artifact === "folderStructure"
            ? { content: updated.folderStructure }
            : {}),
          ...(artifact === "apiDesign" ? { content: updated.apiDesign } : {}),
          ...(artifact === "testingPlan"
            ? { content: updated.testingPlan }
            : {}),
          ...(artifact === "config" ? { content: updated.yaml } : {}),
        }),
      );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GENERATE MODE
    // ══════════════════════════════════════════════════════════════════════════

    // ── "initial" — YAML (silent) + Markdown (shown in UI) ───────────────────
    if (artifact === "initial") {
      const configKey = getApiKey("config", fallback);
      const markdownKey = getApiKey("markdown", fallback);

      // 1. YAML — stored in session, not shown in UI
      const configResult = await callGroq(
        configKey,
        SOFTWARE_CONFIG_PROMPT,
        prompt,
        history,
        TOKEN_BUDGET.config,
        "config",
      );
      if (!configResult)
        return errorResponse("Config generation failed", "LLM_ERROR", 500);
      const yaml = configResult.content;

      session.history.push({ role: "user", content: prompt });
      session.history.push({
        role: "assistant",
        content: compressForHistory(yaml, "config"),
      });

      const stackSummary = summarizeYaml(yaml);

      // 2. Markdown docs — shown in UI immediately
      const markdownCtx = `Project description: ${prompt}\nStack summary: ${stackSummary}`;
      const markdownResult = await callGroqRaw(
        markdownKey,
        MARKDOWN_PROMPT,
        markdownCtx,
        trimHistory(session.history),
        TOKEN_BUDGET.markdown,
        "markdown",
      );
      if (!markdownResult)
        return errorResponse("Docs generation failed", "LLM_ERROR", 500);
      const markdown = markdownResult.content;

      session.history.push({
        role: "assistant",
        content: compressForHistory(markdown, "markdown"),
      });

      await deductTokens(userId, configResult.tokens + markdownResult.tokens);

      // Store partial result — other artifacts filled lazily as user requests them
      session.lastResult = {
        yaml: safeYaml(yaml),
        markdown,
        docker: "",
        pipeline: "",
        folderStructure: "",
        apiDesign: "",
        testingPlan: "",
      };

      await saveAssistantMessage(
        sessionId,
        userId,
        JSON.stringify(session.lastResult),
      );
      await memoryStore.addMessage(sessionId, {
        role: "assistant",
        content: JSON.stringify(session.lastResult),
        userId,
      });
      await saveArtifact(sessionId, userId, "config", yaml);
      await saveArtifact(sessionId, userId, "docs", markdown);
      await memoryStore.addArtifact(sessionId, {
        type: "config",
        content: yaml,
        userId,
      });
      await memoryStore.addArtifact(sessionId, {
        type: "docs",
        content: markdown,
        userId,
      });
      await saveSessionMetadata(sessionId, userId, generatedTitle);
      await memoryStore.updateSession(sessionId, {
        userId,
        ...(generatedTitle && { title: generatedTitle }),
      });

      return secureHeaders(
        NextResponse.json({
          artifact: "initial",
          yaml: session.lastResult.yaml,
          markdown: session.lastResult.markdown,
        }),
      );
    }

    // ── Single artifact — requires an existing session config ─────────────────
    if (!session.lastResult?.yaml)
      return errorResponse(
        "No config in session. Generate initial result first.",
        "NO_SESSION_CONFIG",
        400,
      );

    const stackSummary = summarizeYaml(session.lastResult.yaml);
    let content = "";
    let tokens = 0;

    switch (artifact) {
      case "config": {
        const r = await callGroq(
          getApiKey("config", fallback),
          SOFTWARE_CONFIG_PROMPT,
          prompt,
          history,
          TOKEN_BUDGET.config,
          "config",
        );
        if (!r)
          return errorResponse("Config generation failed", "LLM_ERROR", 500);
        content = safeYaml(r.content);
        tokens = r.tokens;
        session.lastResult.yaml = content;
        session.history.push({
          role: "assistant",
          content: compressForHistory(content, "config"),
        });
        break;
      }
      case "docker": {
        const r = await callGroq(
          getApiKey("docker", fallback),
          DOCKER_PROMPT,
          `Generate docker-compose for this stack: ${stackSummary}`,
          history,
          TOKEN_BUDGET.docker,
          "docker",
        );
        if (!r)
          return errorResponse("Docker generation failed", "LLM_ERROR", 500);
        content = safeYaml(r.content);
        tokens = r.tokens;
        session.lastResult.docker = content;
        session.history.push({
          role: "assistant",
          content: compressForHistory(content, "docker"),
        });
        break;
      }
      case "pipeline": {
        const r = await callGroq(
          getApiKey("pipeline", fallback),
          PIPELINE_PROMPT,
          `Generate CI/CD pipeline for: ${stackSummary}`,
          history,
          TOKEN_BUDGET.pipeline,
          "pipeline",
        );
        if (!r)
          return errorResponse("Pipeline generation failed", "LLM_ERROR", 500);
        content = r.content;
        tokens = r.tokens;
        session.lastResult.pipeline = content;
        session.history.push({
          role: "assistant",
          content: compressForHistory(content, "pipeline"),
        });
        break;
      }
      case "markdown": {
        const r = await callGroqRaw(
          getApiKey("markdown", fallback),
          MARKDOWN_PROMPT,
          `Project description: ${prompt}\nStack summary: ${stackSummary}`,
          history,
          TOKEN_BUDGET.markdown,
          "markdown",
        );
        if (!r)
          return errorResponse("Docs generation failed", "LLM_ERROR", 500);
        content = r.content;
        tokens = r.tokens;
        session.lastResult.markdown = content;
        session.history.push({
          role: "assistant",
          content: compressForHistory(content, "markdown"),
        });
        break;
      }
      case "folderStructure": {
        const r = await callGroq(
          getApiKey("folderStructure", fallback),
          FOLDER_STRUCTURE_PROMPT,
          `Generate folder structure for: ${stackSummary}`,
          history,
          TOKEN_BUDGET.folderStructure,
          "folderStructure",
        );
        if (!r)
          return errorResponse(
            "Folder structure generation failed",
            "LLM_ERROR",
            500,
          );
        content = r.content;
        tokens = r.tokens;
        session.lastResult.folderStructure = content;
        break;
      }
      case "apiDesign": {
        const r = await callGroq(
          getApiKey("apiDesign", fallback),
          API_DESIGN_PROMPT,
          `Generate API design for: ${stackSummary}`,
          history,
          TOKEN_BUDGET.apiDesign,
          "apiDesign",
        );
        if (!r)
          return errorResponse(
            "API design generation failed",
            "LLM_ERROR",
            500,
          );
        content = r.content;
        tokens = r.tokens;
        session.lastResult.apiDesign = content;
        session.history.push({
          role: "assistant",
          content: compressForHistory(content, "apidesign"),
        });
        break;
      }
      case "testingPlan": {
        const r = await callGroq(
          getApiKey("testingPlan", fallback),
          TESTING_PLAN_PROMPT,
          `Generate testing plan for: ${stackSummary}`,
          history,
          TOKEN_BUDGET.testingPlan,
          "testingPlan",
        );
        if (!r)
          return errorResponse(
            "Testing plan generation failed",
            "LLM_ERROR",
            500,
          );
        content = r.content;
        tokens = r.tokens;
        session.lastResult.testingPlan = content;
        session.history.push({
          role: "assistant",
          content: compressForHistory(content, "testingplan"),
        });
        break;
      }
      case "db": {
        const dbSchema = await callN8nDbDesign(prompt, stackSummary);
        if (!dbSchema)
          return errorResponse("DB schema generation failed", "N8N_ERROR", 500);
        session.lastResult.dbSchema = dbSchema;
        await saveArtifact(
          sessionId,
          userId,
          "dbSchema",
          JSON.stringify(dbSchema),
        );
        await memoryStore.addArtifact(sessionId, {
          type: "dbSchema",
          content: JSON.stringify(dbSchema),
          userId,
        });
        await saveSessionMetadata(sessionId, userId, generatedTitle);
        await memoryStore.updateSession(sessionId, {
          userId,
          ...(generatedTitle && { title: generatedTitle }),
        });
        return secureHeaders(NextResponse.json({ artifact: "db", dbSchema }));
      }
      default:
        return errorResponse(
          `Unknown artifact: ${artifact}`,
          "BAD_REQUEST",
          400,
        );
    }

    await deductTokens(userId, tokens);
    await saveArtifact(sessionId, userId, artifact, content);
    await memoryStore.addArtifact(sessionId, {
      type: artifact,
      content,
      userId,
    });
    await saveAssistantMessage(
      sessionId,
      userId,
      JSON.stringify({ artifact, content }),
    );
    await memoryStore.addMessage(sessionId, {
      role: "assistant",
      content: JSON.stringify({ artifact, content }),
      userId,
    });
    await saveSessionMetadata(sessionId, userId, generatedTitle);
    await memoryStore.updateSession(sessionId, {
      userId,
      ...(generatedTitle && { title: generatedTitle }),
    });

    return secureHeaders(NextResponse.json({ artifact, content }));
  } catch (err) {
    log.error("Unhandled error", { err: String(err) });
    return errorResponse("Internal server error", "SERVER_ERROR", 500);
  }
}
