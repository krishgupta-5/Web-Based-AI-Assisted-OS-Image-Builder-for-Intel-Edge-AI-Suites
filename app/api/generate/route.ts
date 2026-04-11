/**
 * /api/generate/route.ts
 * Edge-OS — Production-ready Groq generation handler.
 *
 * All fixes applied:
 *  1.  PREV_ history prefix — stops model confusing history tags with YAML keys
 *  2.  Per-session state via sessionId — no shared globals between users/tabs
 *  3.  LRU session store with TTL eviction — no memory leaks
 *  4.  Input validation & sanitisation — length cap, PREV_ injection guard
 *  5.  Request timeout (30s) — no hanging requests
 *  6.  Structured error codes — client can handle each failure type
 *  7.  Security headers on every response
 *  8.  Cache keyed by sessionId+prompt — no cross-user cache hits
 *  9.  detectChanges tracks name/type/arch — renames trigger full regen
 * 10.  extractYamlBlock — strips leading prose before YAML block
 * 11.  isTruncated — FIXED: no longer false-positives on valid docker-compose endings
 * 12.  stop tokens fixed — removed "\n\n\n" that cut pipeline/markdown early
 * 13.  Markdown temperature bumped to 0.3 — less repetitive docs
 * 14.  Structured JSON logger — replaces console.log
 * 15.  All magic numbers extracted to named constants
 * 16.  n8n DB schema integration — calls n8n webhook, renders diagram inline
 * 17.  Modify mode cache invalidation fix — cache cleared on modify
 * 18.  "default" sessionId fallback replaced with null guard
 * 19.  TOKEN_BUDGET.docker raised to 1200 — prevents truncation-retry loop
 * 20.  isTruncated rewritten — only flags genuinely cut-off output
 */

import { NextResponse } from "next/server";
import YAML from "yaml";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const MODEL              = "llama-3.1-8b-instant";
const MAX_RETRIES        = 3;
const MAX_HISTORY        = 6;               // 3 user + 3 assistant pairs
const SESSION_TTL_MS     = 30 * 60 * 1000; // 30 min
const MAX_SESSIONS       = 500;
const PROMPT_MAX_LEN     = 2000;
const PROMPT_MIN_LEN     = 5;
const REQUEST_TIMEOUT_MS = 30_000;
const N8N_TIMEOUT_MS = 45_000;

// Per-artifact token budgets
// docker raised to 1200 to prevent truncation on healthcheck/volumes blocks
const TOKEN_BUDGET = {
  config:   500,
  docker:   1200,
  pipeline: 600,
  markdown: 800,
} as const;

// Explicit image map injected into DOCKER_PROMPT
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
interface DbSchema {
  mermaid: string;  // raw mermaid ERD string
  diagram: string;  // rendered SVG string or image URL from Kroki
}

interface GenerateResult {
  yaml:     string;
  docker:   string;
  pipeline: string;
  markdown: string;
  dbSchema?: DbSchema;
}

interface RegenerateFlags {
  docker:   boolean;
  pipeline: boolean;
  markdown: boolean;
}

type Role       = "user" | "assistant";
type HistoryMsg = { role: Role; content: string };

interface SessionData {
  history:    HistoryMsg[];
  lastResult: GenerateResult | null;
  cache:      Map<string, GenerateResult>;
  updatedAt:  number;
}

// ─────────────────────────────────────────────
// Structured logger
// ─────────────────────────────────────────────
const log = {
  info:  (msg: string, meta?: object) =>
    console.log(JSON.stringify({ level: "info",  msg, ...meta, ts: Date.now() })),
  warn:  (msg: string, meta?: object) =>
    console.warn(JSON.stringify({ level: "warn",  msg, ...meta, ts: Date.now() })),
  error: (msg: string, meta?: object) =>
    console.error(JSON.stringify({ level: "error", msg, ...meta, ts: Date.now() })),
};

// ─────────────────────────────────────────────
// LRU Session store
// ─────────────────────────────────────────────
const sessions = new Map<string, SessionData>();

function getSession(id: string): SessionData {
  const now = Date.now();

  if (sessions.size >= MAX_SESSIONS) {
    for (const [k, v] of sessions) {
      if (now - v.updatedAt > SESSION_TTL_MS) sessions.delete(k);
    }
    if (sessions.size >= MAX_SESSIONS) {
      const oldest = [...sessions.entries()]
        .sort((a, b) => a[1].updatedAt - b[1].updatedAt)[0];
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
// YAML summarizer
// ─────────────────────────────────────────────
function summarizeYaml(yamlText: string): string {
  const get = (key: string): string =>
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

// ─────────────────────────────────────────────
// History compressor
// ─────────────────────────────────────────────
function compressForHistory(content: string, label: string): string {
  if (label === "config") {
    return `PREV_CONFIG: ${summarizeYaml(content)}`;
  }
  const preview = content.replace(/\s+/g, " ").trim().slice(0, 100);
  return `PREV_${label.toUpperCase()}: ${preview}...`;
}

// ─────────────────────────────────────────────
// Diff detector
// ─────────────────────────────────────────────
function detectChanges(oldYaml: string, newYaml: string): RegenerateFlags {
  const get = (yaml: string, key: string): string =>
    new RegExp(`${key}:\\s*(.+)`).exec(yaml)?.[1]?.trim() ?? "";

  const allTracked = [
    "name", "type", "architecture",
    "primary", "cache", "deployment",
    "language", "framework", "api",
    "strategy", "ci_cd",
  ];

  const dockerFields = new Set([
    "primary", "cache", "deployment", "language", "framework",
  ]);

  const changed = new Set<string>();
  for (const field of allTracked) {
    if (get(oldYaml, field) !== get(newYaml, field)) changed.add(field);
  }

  log.info("Diff detected", { changed: [...changed] });

  return {
    docker:   [...changed].some(f => dockerFields.has(f)),
    pipeline: changed.size > 0,
    markdown: changed.size > 0,
  };
}

// ─────────────────────────────────────────────
// extractYamlBlock
// ─────────────────────────────────────────────
function extractYamlBlock(text: string): string {
  const lines = text.split("\n");
  const topLevelKeys = /^(system|backend|frontend|database|auth|infra|pipeline|version|services):/;
  const start = lines.findIndex(l => topLevelKeys.test(l.trim()));
  return start >= 0 ? lines.slice(start).join("\n").trim() : text.trim();
}

// ─────────────────────────────────────────────
// isTruncated — FIXED
//
// Previous version false-positived on valid docker-compose endings like:
//   volumes:
//     db_data:          ← ends with ":" but is COMPLETE
//   depends_on:
//     - db              ← "- db" not truncated
//   healthcheck:        ← valid terminal key
//
// New logic:
//   - A file is truncated only if the LAST NON-EMPTY line is a bare key
//     with NO corresponding value AND the file has fewer than a minimum
//     number of lines (i.e. it clearly stopped mid-structure).
//   - Known safe terminal patterns are explicitly whitelisted.
// ─────────────────────────────────────────────
function isTruncated(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const lines = trimmed.split("\n");

  // Need at least some content — very short output is suspicious
  if (lines.length < 5) return true;

  const last = lines[lines.length - 1].trim();

  // These are valid final lines in docker-compose / YAML — never truncated
  const safeTerminals = [
    /^[a-z_]+:$/,              // named volume key like "db_data:"
    /^\s*retries:\s*\d+$/,     // healthcheck retries
    /^\s*timeout:\s*\S+$/,     // healthcheck timeout
    /^\s*interval:\s*\S+$/,    // healthcheck interval
    /^\s*- \S+/,               // list item like "- db"
    /^\s*volumes:$/,           // volumes: section header (valid end)
    /^\s*depends_on:$/,        // depends_on: section header
  ];

  // If last line matches a known safe terminal, it's NOT truncated
  if (safeTerminals.some(re => re.test(last))) return false;

  // Only flag as truncated if last line is a bare "key:" with no value
  // AND it looks like it's mid-sentence (not a section header we'd expect)
  const isBareKey = /^[a-zA-Z_-]+:$/.test(last);
  const isListDash = last === "-";

  // For bare keys that aren't safe terminals, only flag if file is short
  // (long files that end with a bare key are likely complete volume names)
  if (isBareKey && lines.length < 20) return true;
  if (isListDash) return true;

  return false;
}

// ─────────────────────────────────────────────
// Input sanitiser
// ─────────────────────────────────────────────
function sanitisePrompt(raw: string): string {
  return raw
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\bPREV_[A-Z]+:/g, "")
    .trim()
    .slice(0, PROMPT_MAX_LEN);
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

EXAMPLE (for a task manager app):
system:
  name: task-manager
  type: saas
  architecture: monolith
backend:
  language: nodejs
  framework: express
  api: rest
  port: 3000
frontend:
  framework: react
  port: 3001
database:
  primary: postgresql
  cache: redis
auth:
  strategy: jwt
infra:
  deployment: docker
  ci_cd: github-actions

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
- CRITICAL: The database image MUST exactly match the db field in the stack summary. Never default to postgres if db is mongodb.
- Backend image must match the lang field.
- Add environment variables relevant to the stack.
- Add named volumes and depends_on for the database.
- Add a healthcheck for the database service.
- Expose the correct ports (from the stack summary).
- Output raw YAML only. No prose before or after.
- Always end the file with the named volumes block. Example: volumes:\\n  db_data:
- IMPORTANT: Always complete the entire file — never stop mid-block.

EXAMPLE output structure:
version: "3.8"
services:
  backend:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - .:/app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mongodb://db:27017/myapp
    depends_on:
      - db
  db:
    image: mongo:7
    volumes:
      - db_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=myapp
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
volumes:
  db_data:`;

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
- Match step titles exactly to the system described — no generic labels like "Process Data".
- name must match the system name in the stack summary.
- Lines starting with PREV_ are context metadata — do NOT copy them into your output.
- Output ONLY the YAML block. Nothing else.
- Always complete the entire file — never stop mid-block.`;

const MARKDOWN_PROMPT = `You are a senior engineer writing a README.md. Output raw Markdown only — do NOT wrap the full output in a code fence.

Write these sections in order:

# <Project Name>
A clear one-paragraph overview of what the system does and who it is for.

## Architecture
2–4 sentences describing the architecture pattern and how the components connect.

## Tech Stack
A bullet list — one technology per line with a brief one-line description.

## Features
5–8 bullet points covering the most important features of this system.

## API Overview
List the main endpoint groups with one-line descriptions. Skip this section entirely if there is no API.

## Getting Started
Numbered steps to run the project locally using Docker Compose.

RULES:
- Every line must be specific to this system — no placeholder or filler text.
- Lines starting with PREV_ are context metadata — do NOT copy them into your output.
- Output raw Markdown only. No wrapping code fence around the entire document.
- Always complete the entire document — never stop mid-section.`;

// ─────────────────────────────────────────────
// Core helpers
// ─────────────────────────────────────────────
function safeYaml(text: string): string {
  try { YAML.parse(text); }
  catch { log.warn("YAML parse warning — returning raw output"); }
  return text;
}

function stripFences(text: string): string {
  return text
    .replace(/^```(?:yaml|yml|json|markdown|md|dockerfile)?\s*/gim, "")
    .replace(/^```\s*/gim, "")
    .replace(/```\s*$/gim, "")
    .trim();
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error(`Timeout after ${ms}ms`)), ms)
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

function errorResponse(error: string, code: string, status: number): NextResponse {
  return secureHeaders(NextResponse.json({ error, code }, { status }));
}

// ─────────────────────────────────────────────
// n8n DB Schema + Diagram
// ─────────────────────────────────────────────
async function callN8nDbDesign(
  prompt: string,
  stackSummary: string
): Promise<DbSchema | null> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    log.warn("N8N_WEBHOOK_URL not set — skipping DB design");
    return null;
  }

  try {
    log.info("Calling n8n DB design webhook", { prompt: prompt.slice(0, 80) });

    const res = await withTimeout(
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, stackSummary }),
      }),
      N8N_TIMEOUT_MS
    );

    if (!res.ok) {
      log.error("n8n webhook error", { status: res.status, body: await res.text() });
      return null;
    }

    const text = await res.text();
    // n8n sometimes leaks the expression "=" prefix into Text responses
    const cleanText = text.trimStart().startsWith('=') ? text.trimStart().slice(1) : text;
    
    let data: any;
    try {
      data = JSON.parse(cleanText);
    } catch {
      log.error("n8n response is not JSON", { preview: cleanText.slice(0, 200) });
      return null;
    }

    const payload = Array.isArray(data) ? data[0] : data;

    const mermaid: string =
      payload?.mermaid   ??
      payload?.schema    ??
      payload?.erd       ??
      payload?.text      ??
      "";

    const diagram: string =
      payload?.diagram   ??
      payload?.svg       ??
      payload?.image     ??
      payload?.url       ??
      payload?.output    ??
      "";

    if (!mermaid && !diagram) {
      log.warn("n8n returned empty DB schema payload", { payload });
      return null;
    }

    log.info("n8n DB schema received", { hasMermaid: !!mermaid, hasDiagram: !!diagram });
    return { mermaid, diagram };

  } catch (err) {
    log.error("n8n call failed", { err: String(err) });
    return null;
  }
}

// ─────────────────────────────────────────────
// Groq API call
// ─────────────────────────────────────────────
async function callGroq(
  apiKey:       string,
  systemPrompt: string,
  userMessage:  string,
  history:      HistoryMsg[],
  maxTokens:    number,
  label:        string,
  attempt0 =    0
): Promise<string | null> {
  const temperature = label === "markdown" ? 0.3 : 0.1;

  const stopTokens = (label === "config" || label === "docker")
    ? ["```"]
    : [];

  for (let attempt = attempt0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const fetchPromise = fetch("https://api.groq.com/openai/v1/chat/completions", {
        method:  "POST",
        headers: {
          Authorization:  `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user",   content: userMessage },
          ],
          temperature,
          max_tokens: maxTokens,
          top_p:      0.9,
          ...(stopTokens.length > 0 ? { stop: stopTokens } : {}),
        }),
      });

      const res = await withTimeout(fetchPromise, REQUEST_TIMEOUT_MS);

      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        const waitMs = retryAfter
          ? parseFloat(retryAfter) * 1000
          : Math.pow(2, attempt) * 3000;
        log.warn("Groq rate limited", { label, attempt, waitMs });
        if (attempt < MAX_RETRIES) { await sleep(waitMs); continue; }
        return null;
      }

      if (!res.ok) {
        log.error("Groq API error", { label, status: res.status, body: await res.text() });
        return null;
      }

      const data  = await res.json();
      const raw: string = data?.choices?.[0]?.message?.content ?? "";
      const cleaned = extractYamlBlock(stripFences(raw));

      log.info("Groq call OK", { label, tokens: data?.usage?.total_tokens });

      if (isTruncated(cleaned) && attempt < MAX_RETRIES) {
        log.warn("Truncated output detected, retrying", { label, attempt });
        return callGroq(
          apiKey, systemPrompt, userMessage, history,
          Math.ceil(maxTokens * 1.25), label, attempt + 1
        );
      }

      return cleaned;

    } catch (err) {
      log.error("Groq fetch error", { label, attempt, err: String(err) });
      if (attempt < MAX_RETRIES) { await sleep(Math.pow(2, attempt) * 2000); continue; }
      return null;
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// POST handler
// ─────────────────────────────────────────────
export async function POST(req: Request) {
  try {

    // ── 1. Parse & validate ──────────────────────────────────────────────────
    let body: {
      prompt?:    unknown;
      mode?:      unknown;
      sessionId?: unknown;
    };
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", "BAD_REQUEST", 400);
    }

    const rawPrompt = typeof body.prompt    === "string" ? body.prompt    : "";
    const mode      = typeof body.mode      === "string" ? body.mode      : "generate";
    const rawSid    = typeof body.sessionId === "string" ? body.sessionId : "";

    const sessionId = rawSid.trim() || `anon-${Date.now()}`;
    const prompt = sanitisePrompt(rawPrompt);

    if (!prompt || prompt.length < PROMPT_MIN_LEN) {
      return errorResponse(
        prompt ? "Prompt is too short (min 5 chars)" : "Prompt is required",
        prompt ? "PROMPT_TOO_SHORT" : "MISSING_PROMPT",
        400
      );
    }

    // ── 2. API key ───────────────────────────────────────────────────────────
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      log.error("GROQ_API_KEY env var not set");
      return errorResponse("Server misconfiguration", "MISSING_API_KEY", 500);
    }

    // ── 3. Session ───────────────────────────────────────────────────────────
    const session  = getSession(sessionId);
    const cacheKey = `${sessionId}:${prompt.toLowerCase().trim()}`;

    // ── 4. Cache hit (skipped on modify) ────────────────────────────────────
    if (mode !== "modify" && session.cache.has(cacheKey)) {
      log.info("Cache hit", { sessionId });
      return secureHeaders(NextResponse.json(session.cache.get(cacheKey)));
    }

    // ── 5. Build user message ────────────────────────────────────────────────
    const userMessage = mode === "modify" && session.lastResult
      ? `PREV_CONFIG: ${summarizeYaml(session.lastResult.yaml)}\n\nRequested changes: ${prompt}`
      : prompt;

    const history = trimHistory(session.history);

    // ────────────────────────────────────────────────────────────────────────
    // MODIFY MODE
    // ────────────────────────────────────────────────────────────────────────
    if (mode === "modify" && session.lastResult) {
      const oldYaml = session.lastResult.yaml;

      const yaml = await callGroq(
        apiKey, SOFTWARE_CONFIG_PROMPT, userMessage, history, TOKEN_BUDGET.config, "config"
      );
      if (!yaml) return errorResponse("Config regeneration failed", "LLM_ERROR", 500);

      session.history.push({ role: "user",      content: userMessage });
      session.history.push({ role: "assistant", content: compressForHistory(yaml, "config") });

      const flags = detectChanges(oldYaml, yaml);
      log.info("Modify regen flags", { sessionId, flags });

      let docker   = session.lastResult.docker;
      let pipeline = session.lastResult.pipeline;
      let markdown = session.lastResult.markdown;
      let dbSchema = session.lastResult.dbSchema;

      if (flags.docker) {
        const ctx = `Generate docker-compose for this UPDATED stack: ${summarizeYaml(yaml)}. The db field may have changed — use the IMAGE MAP to pick the correct database image.`;
        const fresh = await callGroq(apiKey, DOCKER_PROMPT, ctx, trimHistory(session.history), TOKEN_BUDGET.docker, "docker");
        if (fresh) {
          docker = fresh;
          session.history.push({ role: "assistant", content: compressForHistory(docker, "docker") });
        }
      }

      if (flags.pipeline) {
        const ctx = `Generate pipeline for UPDATED system: ${summarizeYaml(yaml)}`;
        const fresh = await callGroq(apiKey, PIPELINE_PROMPT, ctx, trimHistory(session.history), TOKEN_BUDGET.pipeline, "pipeline");
        if (fresh) {
          pipeline = fresh;
          session.history.push({ role: "assistant", content: compressForHistory(pipeline, "pipeline") });
        }
      }

      if (flags.markdown) {
        const ctx = `Project (updated): ${prompt}\nStack summary: ${summarizeYaml(yaml)}`;
        const fresh = await callGroq(apiKey, MARKDOWN_PROMPT, ctx, trimHistory(session.history), TOKEN_BUDGET.markdown, "markdown");
        if (fresh) {
          markdown = fresh;
          session.history.push({ role: "assistant", content: compressForHistory(markdown, "markdown") });
        }
      }

      if (flags.docker) {
        const n8nResult = await callN8nDbDesign(prompt, summarizeYaml(yaml));
        if (n8nResult) dbSchema = n8nResult;
      }

      const result: GenerateResult = {
        yaml:     safeYaml(yaml),
        docker:   safeYaml(docker),
        pipeline,
        markdown,
        dbSchema,
      };

      session.cache.delete(cacheKey);
      session.lastResult = result;

      return secureHeaders(NextResponse.json(result));
    }

    // ────────────────────────────────────────────────────────────────────────
    // GENERATE MODE
    // ────────────────────────────────────────────────────────────────────────

    // Step 1 — System config
    const yaml = await callGroq(
      apiKey, SOFTWARE_CONFIG_PROMPT, userMessage, history, TOKEN_BUDGET.config, "config"
    );
    if (!yaml) return errorResponse("Config generation failed", "LLM_ERROR", 500);

    session.history.push({ role: "user",      content: userMessage });
    session.history.push({ role: "assistant", content: compressForHistory(yaml, "config") });

    const stackSummary = summarizeYaml(yaml);

    // Step 2 — Docker Compose
    const dockerCtx = `Generate docker-compose for this stack: ${stackSummary}`;
    const docker = await callGroq(
      apiKey, DOCKER_PROMPT, dockerCtx, trimHistory(session.history), TOKEN_BUDGET.docker, "docker"
    );
    if (!docker) return errorResponse("Docker generation failed", "LLM_ERROR", 500);
    session.history.push({ role: "assistant", content: compressForHistory(docker, "docker") });

    // Step 3 — Pipeline
    const pipelineCtx = `Generate CI/CD pipeline for: ${stackSummary}`;
    const pipeline = await callGroq(
      apiKey, PIPELINE_PROMPT, pipelineCtx, trimHistory(session.history), TOKEN_BUDGET.pipeline, "pipeline"
    );
    if (!pipeline) return errorResponse("Pipeline generation failed", "LLM_ERROR", 500);
    session.history.push({ role: "assistant", content: compressForHistory(pipeline, "pipeline") });

    // Step 4 — Markdown docs
    const markdownCtx = `Project description: ${prompt}\nStack summary: ${stackSummary}`;
    const markdown = await callGroq(
      apiKey, MARKDOWN_PROMPT, markdownCtx, trimHistory(session.history), TOKEN_BUDGET.markdown, "markdown"
    );
    if (!markdown) return errorResponse("Docs generation failed", "LLM_ERROR", 500);
    session.history.push({ role: "assistant", content: compressForHistory(markdown, "markdown") });

    // Step 5 — DB Schema via n8n (non-blocking)
    const dbSchema = await callN8nDbDesign(prompt, stackSummary);
    if (dbSchema) {
      log.info("DB schema attached to result");
    }

    const result: GenerateResult = {
      yaml:     safeYaml(yaml),
      docker:   safeYaml(docker),
      pipeline: safeYaml(pipeline),
      markdown,
      ...(dbSchema ? { dbSchema } : {}),
    };

    session.cache.set(cacheKey, result);
    session.lastResult = result;

    return secureHeaders(NextResponse.json(result));

  } catch (err) {
    log.error("Unhandled handler error", { err: String(err) });
    return errorResponse("Internal server error", "SERVER_ERROR", 500);
  }
}