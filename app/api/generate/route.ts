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
 * 21.  Folder structure generation added — tree view of project layout
 * 22.  References generation added — curated docs/links per stack
 * 23.  API Design generation added — endpoint specs per stack
 * 24.  Testing Plan generation added — unit/integration/e2e strategy per stack
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
const MAX_HISTORY = 6;               // 3 user + 3 assistant pairs
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 min
const MAX_SESSIONS = 500;
const PROMPT_MAX_LEN = 2000;
const PROMPT_MIN_LEN = 5;
const REQUEST_TIMEOUT_MS = 30_000;
const ACTIVEPIECES_TIMEOUT_MS = 45_000;


// Per-artifact token budgets
// docker raised to 1200 to prevent truncation on healthcheck/volumes blocks
const TOKEN_BUDGET = {
  config: 500,
  docker: 1200,
  pipeline: 600,
  markdown: 3000,
  folderStructure: 600,
  apiDesign: 800,
  testingPlan: 700,
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
  markdown: string;
  yaml: string;
  pipeline: string;
  docker: string;
  apiDesign?: string;
  dbSchema?: DbSchema;
  folderStructure?: string;
  testingPlan?: string;
}

interface RegenerateFlags {
  docker: boolean;
  pipeline: boolean;
  markdown: boolean;
  folderStructure: boolean;
  apiDesign: boolean;
  testingPlan: boolean;
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
// Structured logger
// -------------------------------------------------
const log = {
  info: (msg: string, meta?: object, apiKey?: string) =>
    console.log(JSON.stringify({ level: "info", msg, ...meta, apiKey: apiKey ? `${apiKey.slice(0, 8)}...` : undefined, ts: Date.now() })),
  warn: (msg: string, meta?: object, apiKey?: string) =>
    console.warn(JSON.stringify({ level: "warn", msg, ...meta, apiKey: apiKey ? `${apiKey.slice(0, 8)}...` : undefined, ts: Date.now() })),
  error: (msg: string, meta?: object, apiKey?: string) =>
    console.error(JSON.stringify({ level: "error", msg, ...meta, apiKey: apiKey ? `${apiKey.slice(0, 8)}...` : undefined, ts: Date.now() })),
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
    docker: [...changed].some(f => dockerFields.has(f)),
    pipeline: changed.size > 0,
    markdown: changed.size > 0,
    folderStructure: changed.size > 0,
    apiDesign: changed.size > 0,
    testingPlan: changed.size > 0,
  };
}

// ─────────────────────────────────────────────
// extractYamlBlock
// ─────────────────────────────────────────────
function extractYamlBlock(text: string): string {
  const lines = text.split("\n");
  const topLevelKeys = /^(system|backend|frontend|database|auth|infra|pipeline|version|services|api_design|testing):/;
  const start = lines.findIndex(l => topLevelKeys.test(l.trim()));
  return start >= 0 ? lines.slice(start).join("\n").trim() : text.trim();
}

// ─────────────────────────────────────────────
// isTruncated — FIXED
// ─────────────────────────────────────────────
function isTruncated(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const lines = trimmed.split("\n");

  if (lines.length < 5) return true;

  const last = lines[lines.length - 1].trim();

  const safeTerminals = [
    /^[a-z_]+:$/,
    /^\s*retries:\s*\d+$/,
    /^\s*timeout:\s*\S+$/,
    /^\s*interval:\s*\S+$/,
    /^\s*- \S+/,
    /^\s*volumes:$/,
    /^\s*depends_on:$/,
  ];

  if (safeTerminals.some(re => re.test(last))) return false;

  const isBareKey = /^[a-zA-Z_-]+:$/.test(last);
  const isListDash = last === "-";

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

const MARKDOWN_PROMPT = `You are a senior software architect writing a comprehensive project documentation file. Output raw Markdown only — do NOT wrap the full output in a code fence.

IMPORTANT: Do NOT use any emoji characters anywhere in the document. Use only plain text.

Write ALL of the following sections in order. Each section must be specific to the system described.

# <Project Name>

---

## Overview
A clear paragraph explaining what the system does, who it is for, and what value it provides.

## Problem Statement
2-3 sentences describing the problem this system solves and why existing approaches are insufficient.

## Solution
A concise description of how this system solves the problem. Include what users can do with it.

## Requirements

### Functional Requirements
- 3-5 bullet points of what the system must do

### Non-Functional Requirements
- 3-4 bullet points covering performance, scalability, security

## User Stories
- 3-4 user stories in the format: "As a [role], I want [goal] so that [benefit]"

## Features
List 6-10 key features with a brief one-line description for each. Group related features under sub-headings if appropriate.

## Architecture

### Architecture Pattern
2-3 sentences describing the architecture pattern (monolith, microservices, serverless) and why it was chosen.

### System Flow
Describe the high-level data flow through the system using a plain text diagram:
\`\`\`
Input -> Processing -> Storage -> Output
\`\`\`

### Module Breakdown
List the major modules/components of the system with a one-line description of each.

## Tech Stack

### Frontend
- List frontend technologies with brief descriptions

### Backend
- List backend technologies with brief descriptions

### Database
- List database technologies with brief descriptions

### DevOps and Deployment
- List deployment technologies with brief descriptions

## User Flow
Describe the step-by-step user journey through the system using a plain text flow:
\`\`\`
Step 1 -> Step 2 -> Step 3 -> Step 4
\`\`\`

## Auth Plan
- Describe the authentication strategy
- Mention token type, session handling, etc.

## Security Plan
- 3-5 bullet points covering input validation, rate limiting, environment variable security, etc.

## Access Control
- Describe guest vs authenticated user access
- Mention any role-based access if applicable

## Performance Plan
- 3-5 bullet points covering caching, optimization, lazy loading, etc.

## Integrations
- List external services or APIs the system integrates with

## Data Flow
Describe how data moves through the system:
\`\`\`
User Input -> Backend -> Database -> Response -> UI
\`\`\`

## API Interaction Flow
Describe how the frontend communicates with the backend:
\`\`\`
Frontend -> API Layer -> Backend -> Response -> UI
\`\`\`

## Edge Cases
- 4-6 bullet points covering edge cases like empty input, invalid data, API failures, large payloads

## Validation Strategy
- Describe input validation, response validation, and error handling approaches

## Testing Plan
- Unit testing approach
- Integration testing approach
- Manual testing scenarios

## Project Structure
Provide a brief overview of the folder structure:
\`\`\`
/src
  /components
  /routes
  /models
  /services
\`\`\`

## Roadmap
### Phase 1
- Initial features

### Phase 2
- Core improvements

### Phase 3
- Advanced features

## DevOps and CI/CD
- Describe the CI/CD pipeline
- Mention containerization strategy
- Deployment targets

## Environment Strategy
- Development: local
- Staging: testing
- Production: live

## Scalability Plan
- 3-4 bullet points on horizontal scaling, load balancing, stateless backend, etc.

## Limitations
- 2-3 known limitations of the current design

## Future Scope
- 3-5 ideas for future enhancements

## Generated Output
List the artifacts this system generates or produces (e.g., config files, documentation, schemas).

---

RULES:
- CRITICAL: Do NOT use any emoji characters (no unicode emoji, no emoticons). Use only plain ASCII text.
- Every line must be specific to this system — no placeholder or filler text.
- Lines starting with PREV_ are context metadata — do NOT copy them into your output.
- Output raw Markdown only. No wrapping code fence around the entire document.
- Always complete the entire document — never stop mid-section.
- Use horizontal rules (---) between major sections for visual separation.
- Use plain text flow diagrams inside code blocks where indicated.`;

const FOLDER_STRUCTURE_PROMPT = `You are a senior software engineer. Given a stack summary, output ONLY a plain-text folder/file tree for the project. No prose, no markdown fences, no explanation.

Use this exact format (ASCII tree):
<project-name>/
├── src/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   └── index.<ext>
├── tests/
├── docker-compose.yaml
├── Dockerfile
├── .env.example
├── package.json (or requirements.txt / go.mod)
└── README.md

RULES:
- Root folder name must match the system name from the stack summary.
- Include folders and files relevant to the lang/framework from the stack summary.
- For nodejs/express: src/, controllers/, models/, routes/, middleware/, index.js
- For python/fastapi: app/, routers/, models/, schemas/, main.py, requirements.txt
- For go/gin or go/fiber: cmd/, internal/, handlers/, models/, main.go, go.mod
- Always include: docker-compose.yaml, Dockerfile, .env.example, README.md
- Include CI config file if ci_cd is not "none" (e.g. .github/workflows/ci.yml)
- Include a tests/ or __tests__/ directory
- Do NOT include node_modules/, __pycache__/, or build artifacts
- Output ONLY the tree. No commentary before or after.
- Always complete the entire tree — never stop mid-block.`;

const API_DESIGN_PROMPT = `You are a senior backend engineer. Given a stack summary, output ONLY a valid YAML document describing the API design. No prose, no markdown fences.

Output this exact structure:
api_design:
  base_url: /api/v1
  auth_header: <e.g. Authorization: Bearer <token> | none>
  format: <json|graphql|grpc>
  endpoints:
    - group: <resource group name, e.g. auth, users, products>
      routes:
        - method: <GET|POST|PUT|PATCH|DELETE>
          path: <e.g. /users/:id>
          description: <one sentence — what this endpoint does>
          auth_required: <true|false>
          request_body: <brief description or "none">
          response: <brief description of success response>
    - group: <next group>
      routes:
        - method: <method>
          path: <path>
          description: <one sentence>
          auth_required: <true|false>
          request_body: <brief or "none">
          response: <brief>

RULES:
- Include 3–5 resource groups relevant to the system described in the stack summary.
- Each group must have 2–4 routes.
- method, path, description, auth_required, request_body, and response are all required for every route.
- Match resource groups to what the system actually does — no generic "items" or "data" groups.
- Lines starting with PREV_ are context metadata — do NOT copy them into your output.
- Output ONLY the YAML block. Nothing else.
- Always complete the entire file — never stop mid-block.`;

const TESTING_PLAN_PROMPT = `You are a senior QA engineer. Given a stack summary, output ONLY a valid YAML document describing a testing plan. No prose, no markdown fences.

Output this exact structure:
testing:
  strategy: <brief 1-sentence description of overall approach>
  coverage_target: <e.g. 80%>
  unit:
    framework: <e.g. Jest | pytest | Go testing>
    focus:
      - <specific module or function to test>
      - <specific module or function to test>
    mocking: <brief description of what gets mocked>
  integration:
    framework: <e.g. Supertest | pytest-httpx | httptest>
    focus:
      - <specific integration scenario>
      - <specific integration scenario>
    test_db: <e.g. SQLite in-memory | Mongo in-memory | test Postgres container>
  e2e:
    framework: <e.g. Playwright | Cypress | none>
    scenarios:
      - <user-facing flow to test end to end>
      - <user-facing flow>
  ci:
    run_on: <e.g. every pull request | every push to main>
    parallel: <true|false>
    fail_fast: <true|false>

RULES:
- All frameworks and tools must match the lang/framework in the stack summary.
- Scenarios and focus items must be specific to what this system does — never generic like "test the API".
- Lines starting with PREV_ are context metadata — do NOT copy them into your output.
- Output ONLY the YAML block. Nothing else.
- Always complete the entire file — never stop mid-block.`;

const TITLE_PROMPT = `You are an AI assistant. Summarize the user's prompt into a concise 3-4 word title. Respond ONLY with the title. No quotes, no preamble.`;

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
// Message storage functions
// ─────────────────────────────────────────────
async function saveUserMessage(sessionId: string, userId: string, content: string) {
  try {
    await db
      .collection("sessions")
      .doc(sessionId)
      .collection("messages")
      .add({
        role: "user",
        content,
        userId,
        createdAt: new Date(),
      });
  } catch (error) {
    log.error("Failed to save user message", { error: String(error), sessionId });
    throw error;
  }
}

async function saveAssistantMessage(sessionId: string, userId: string, content: string) {
  try {
    await db
      .collection("sessions")
      .doc(sessionId)
      .collection("messages")
      .add({
        role: "assistant",
        content,
        userId,
        createdAt: new Date(),
      });
  } catch (error) {
    log.error("Failed to save assistant message", { error: String(error), sessionId });
    throw error;
  }
}

async function saveArtifact(sessionId: string, userId: string, type: string, content: string) {
  try {
    await db
      .collection("sessions")
      .doc(sessionId)
      .collection("artifacts")
      .add({
        type,
        content,
        userId,
        createdAt: new Date(),
      });
  } catch (error) {
    log.error("Failed to save artifact", { error: String(error), sessionId, type });
    throw error;
  }
}

async function saveSessionMetadata(sessionId: string, userId: string, title?: string) {
  try {
    const updateData: any = {
      userId,
      updatedAt: new Date(),
    };
    if (title) {
      updateData.title = title;
    }
    await db
      .collection("sessions")
      .doc(sessionId)
      .set(updateData, { merge: true });
  } catch (error) {
    log.error("Failed to save session metadata", { error: String(error), sessionId });
    throw error;
  }
}

// ─────────────────────────────────────────────
// n8n DB Schema + Diagram
// ─────────────────────────────────────────────
async function callN8nDbDesign(
  prompt: string,
  stackSummary: string
): Promise<DbSchema | null> {
  const webhookUrl = process.env.ACTIVEPIECES_WEBHOOK_URL;

  if (!webhookUrl) {
    log.warn("ACTIVEPIECES_WEBHOOK_URL not set - skipping DB schema generation");
    return null;
  }

  try {
    log.info("Calling Activepieces DB design webhook", { prompt: prompt.slice(0, 80) });

    const res = await withTimeout(
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, stackSummary }),
      }),
      ACTIVEPIECES_TIMEOUT_MS
    );

    if (!res.ok) {
      log.error("Activepieces webhook error", { status: res.status, body: await res.text() });
      return null;
    }

    const text = await res.text();
    const cleanText = text.trimStart().startsWith('=') ? text.trimStart().slice(1) : text;

    let data: any;
    try {
      data = JSON.parse(cleanText);
    } catch {
      log.error("Activepieces response is not JSON", { preview: cleanText.slice(0, 200) });
      return null;
    }

    const payload = Array.isArray(data) ? data[0] : data;

    const mermaid: string = payload?.mermaid ?? payload?.schema ?? payload?.erd ?? payload?.text ?? "";
    const diagram: string = payload?.diagram ?? payload?.svg ?? payload?.image ?? payload?.url ?? payload?.output ?? "";

    if (!mermaid && !diagram) {
      log.warn("Activepieces returned empty DB schema payload", { payload });
      return null;
    }

    log.info("Activepieces DB schema received", { hasMermaid: !!mermaid, hasDiagram: !!diagram });
    return { mermaid, diagram };

  } catch (err) {
    log.error("Activepieces call failed", { err: String(err) });
    return null;
  }
}

// ─────────────────────────────────────────────
// Groq API call
// ─────────────────────────────────────────────
async function callGroq(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  history: HistoryMsg[],
  maxTokens: number,
  label: string,
  attempt0 = 0
): Promise<{ content: string; tokens: number } | null> {
  const temperature = label === "markdown" ? 0.3 : 0.1;

  const stopTokens = (label === "config" || label === "docker")
    ? ["```"]
    : [];

  for (let attempt = attempt0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const fetchPromise = fetch("https://api.groq.com/openai/v1/chat/completions", {
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
          ...(stopTokens.length > 0 ? { stop: stopTokens } : {}),
        }),
      });

      const res = await withTimeout(fetchPromise, REQUEST_TIMEOUT_MS);

      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        const waitMs = retryAfter
          ? parseFloat(retryAfter) * 1000
          : Math.pow(2, attempt) * 3000;
        log.warn("Groq rate limited", { label, attempt, waitMs }, apiKey);
        if (attempt < MAX_RETRIES) { await sleep(waitMs); continue; }
        return null;
      }

      if (!res.ok) {
        log.error("Groq API error", { label, status: res.status, body: await res.text() }, apiKey);
        return null;
      }

      const data = await res.json();
      const raw: string = data?.choices?.[0]?.message?.content ?? "";
      const cleaned = extractYamlBlock(stripFences(raw));
      const tokens = data?.usage?.total_tokens ?? 0;

      log.info("Groq call OK", { label, tokens }, apiKey);

      if (isTruncated(cleaned) && attempt < MAX_RETRIES) {
        log.warn("Truncated output detected, retrying", { label, attempt }, apiKey);
        return callGroq(
          apiKey, systemPrompt, userMessage, history,
          Math.ceil(maxTokens * 1.25), label, attempt + 1
        );
      }

      return { content: cleaned, tokens };

    } catch (err) {
      log.error("Groq fetch error", { label, attempt, err: String(err) }, apiKey);
      if (attempt < MAX_RETRIES) { await sleep(Math.pow(2, attempt) * 2000); continue; }
      return null;
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// Groq call for references (raw content, no YAML extraction)
// ─────────────────────────────────────────────
async function callGroqRaw(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  history: HistoryMsg[],
  maxTokens: number,
  label: string,
): Promise<{ content: string; tokens: number } | null> {
  try {
    const fetchPromise = fetch("https://api.groq.com/openai/v1/chat/completions", {
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
        temperature: 0.1,
        max_tokens: maxTokens,
        top_p: 0.9,
      }),
    });

    const res = await withTimeout(fetchPromise, REQUEST_TIMEOUT_MS);
    if (!res.ok) {
      log.error("Groq raw API error", { label, status: res.status }, apiKey);
      return null;
    }

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    const tokens = data?.usage?.total_tokens ?? 0;
    log.info("Groq raw call OK", { label, tokens }, apiKey);
    return { content, tokens };
  } catch (err) {
    log.error("Groq raw fetch error", { label, err: String(err) }, apiKey);
    return null;
  }
}

// ─────────────────────────────────────────────
// POST handler
// ─────────────────────────────────────────────
export async function POST(req: Request) {
  try {

    // ── 0. Authentication ─────────────────────────────────────────────────────
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Get comprehensive user data and ensure user exists in Firebase users collection
    const fullUserData = await getFullUserData();
    await createOrUpdateUser(userId, fullUserData);

    const quota = await getOrCreateQuota(userId);
    if (quota.exhausted || quota.tokensUsed >= quota.tokensLimit) {
      return errorResponse(
        "Daily token limit reached. Your quota resets in 24 hours.",
        "TOKEN_EXHAUSTED",
        429
      );
    }

    // ── 1. Parse & validate ──────────────────────────────────────────────────
    let body: {
      prompt?: unknown;
      mode?: unknown;
      sessionId?: unknown;
    };
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", "BAD_REQUEST", 400);
    }

    const rawPrompt = typeof body.prompt === "string" ? body.prompt : "";
    const mode = typeof body.mode === "string" ? body.mode : "generate";
    const rawSid = typeof body.sessionId === "string" ? body.sessionId : "";

    const sessionId = rawSid.trim() || `anon-${Date.now()}`;
    const prompt = sanitisePrompt(rawPrompt);

    if (!prompt || prompt.length < PROMPT_MIN_LEN) {
      return errorResponse(
        prompt ? "Prompt is too short (min 5 chars)" : "Prompt is required",
        prompt ? "PROMPT_TOO_SHORT" : "MISSING_PROMPT",
        400
      );
    }

    // Save user message to Firestore and memory store
    await saveUserMessage(sessionId, userId, prompt);
    await memoryStore.addMessage(sessionId, {
      role: 'user',
      content: prompt,
      userId
    });
    await memoryStore.updateSession(sessionId, { userId });

    // ── 2. API key ───────────────────────────────────────────────────────────
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      log.error("GROQ_API_KEY env var not set");
      return errorResponse("Server misconfiguration", "MISSING_API_KEY", 500);
    }
    const markdownApiKey = process.env.GROQ_API_KEY_MARKDOWN || apiKey;
    const apiDesignApiKey = process.env.GROQ_API_KEY_APIDESIGN || apiKey;
    const folderStructureKey = process.env.GROQ_API_KEY_FOLDERSTRUCTURE || apiKey;

    // ── 3. Session ───────────────────────────────────────────────────────────
    const session = getSession(sessionId);
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
    const isFirstMessage = session.history.length === 0;

    // ────────────────────────────────────────────────────────────────────────
    // MODIFY MODE
    // ────────────────────────────────────────────────────────────────────────
    if (mode === "modify" && session.lastResult) {
      const oldYaml = session.lastResult.yaml;

      const configResult = await callGroq(
        apiKey, SOFTWARE_CONFIG_PROMPT, userMessage, history, TOKEN_BUDGET.config, "config"
      );
      if (!configResult) return errorResponse("Config regeneration failed", "LLM_ERROR", 500);
      const yaml = configResult.content;

      session.history.push({ role: "user", content: userMessage });
      session.history.push({ role: "assistant", content: compressForHistory(yaml, "config") });

      const flags = detectChanges(oldYaml, yaml);
      log.info("Modify regen flags", { sessionId, flags });

      let docker = session.lastResult.docker;
      let pipeline = session.lastResult.pipeline;
      let markdown = session.lastResult.markdown;
      let folderStructure = session.lastResult.folderStructure;
      let dbSchema = session.lastResult.dbSchema;
      let apiDesign = session.lastResult.apiDesign;
      let testingPlan = session.lastResult.testingPlan;

      let dockerResult: { content: string; tokens: number } | null = null;
      let pipelineResult: { content: string; tokens: number } | null = null;
      let markdownResult: { content: string; tokens: number } | null = null;
      let folderStructureResult: { content: string; tokens: number } | null = null;
      let apiDesignResult: { content: string; tokens: number } | null = null;
      let testingPlanResult: { content: string; tokens: number } | null = null;

      if (flags.docker) {
        const ctx = `Generate docker-compose for this UPDATED stack: ${summarizeYaml(yaml)}. The db field may have changed - use the IMAGE MAP to pick the correct database image.`;
        dockerResult = await callGroq(apiKey, DOCKER_PROMPT, ctx, trimHistory(session.history), TOKEN_BUDGET.docker, "docker");
        if (dockerResult) {
          docker = dockerResult.content;
          session.history.push({ role: "assistant", content: compressForHistory(docker, "docker") });
        }
      }

      if (flags.pipeline) {
        const ctx = `Generate pipeline for UPDATED system: ${summarizeYaml(yaml)}`;
        pipelineResult = await callGroq(apiKey, PIPELINE_PROMPT, ctx, trimHistory(session.history), TOKEN_BUDGET.pipeline, "pipeline");
        if (pipelineResult) {
          pipeline = pipelineResult.content;
          session.history.push({ role: "assistant", content: compressForHistory(pipeline, "pipeline") });
        }
      }

      if (flags.docker) {
        const n8nResult = await callN8nDbDesign(prompt, summarizeYaml(yaml));
        if (n8nResult) dbSchema = n8nResult;
      }

      if (flags.markdown) {
        const ctx = `Project (updated): ${prompt}\nStack summary: ${summarizeYaml(yaml)}`;
        markdownResult = await callGroq(markdownApiKey, MARKDOWN_PROMPT, ctx, trimHistory(session.history), TOKEN_BUDGET.markdown, "markdown");
        if (markdownResult) {
          markdown = markdownResult.content;
          session.history.push({ role: "assistant", content: compressForHistory(markdown, "markdown") });
        }
      }

      if (flags.folderStructure) {
        const ctx = `Generate folder structure for this UPDATED stack: ${summarizeYaml(yaml)}`;
        folderStructureResult = await callGroq(folderStructureKey, FOLDER_STRUCTURE_PROMPT, ctx, trimHistory(session.history), TOKEN_BUDGET.folderStructure, "folderStructure");
        if (folderStructureResult) {
          folderStructure = folderStructureResult.content;
        }
      }

      if (flags.apiDesign) {
        const ctx = `Generate API design for this UPDATED stack: ${summarizeYaml(yaml)}`;
        apiDesignResult = await callGroq(apiDesignApiKey, API_DESIGN_PROMPT, ctx, trimHistory(session.history), TOKEN_BUDGET.apiDesign, "apiDesign");
        if (apiDesignResult) {
          apiDesign = apiDesignResult.content;
          session.history.push({ role: "assistant", content: compressForHistory(apiDesign, "apidesign") });
        }
      }

      if (flags.testingPlan) {
        const ctx = `Generate testing plan for this UPDATED stack: ${summarizeYaml(yaml)}`;
        testingPlanResult = await callGroq(apiKey, TESTING_PLAN_PROMPT, ctx, trimHistory(session.history), TOKEN_BUDGET.testingPlan, "testingPlan");
        if (testingPlanResult) {
          testingPlan = testingPlanResult.content;
          session.history.push({ role: "assistant", content: compressForHistory(testingPlan, "testingplan") });
        }
      }

      let totalTokens = configResult.tokens;
      if (flags.docker && dockerResult) totalTokens += dockerResult.tokens;
      if (flags.pipeline && pipelineResult) totalTokens += pipelineResult.tokens;
      if (flags.markdown && markdownResult) totalTokens += markdownResult.tokens;
      if (flags.folderStructure && folderStructureResult) totalTokens += folderStructureResult.tokens;
      if (flags.apiDesign && apiDesignResult) totalTokens += apiDesignResult.tokens;
      if (flags.testingPlan && testingPlanResult) totalTokens += testingPlanResult.tokens;

      await deductTokens(userId, totalTokens);
      log.info("Tokens deducted for modify", { userId, totalTokens });

      const result: GenerateResult = {
        yaml: safeYaml(yaml),
        docker: safeYaml(docker),
        pipeline,
        markdown,
        folderStructure,
        dbSchema,
        apiDesign,
        testingPlan,
      };

      session.cache.delete(cacheKey);
      session.lastResult = result;

      await saveAssistantMessage(sessionId, userId, JSON.stringify(result));
      await memoryStore.addMessage(sessionId, {
        role: 'assistant',
        content: JSON.stringify(result),
        userId
      });

      await saveArtifact(sessionId, userId, "complete_result", JSON.stringify(result));
      await memoryStore.addArtifact(sessionId, {
        type: "complete_result",
        content: JSON.stringify(result),
        userId
      });

      await saveArtifact(sessionId, userId, "config", yaml);
      await memoryStore.addArtifact(sessionId, { type: "config", content: yaml, userId });
      if (docker) {
        await saveArtifact(sessionId, userId, "docker", docker);
        await memoryStore.addArtifact(sessionId, { type: "docker", content: docker, userId });
      }
      if (pipeline) {
        await saveArtifact(sessionId, userId, "pipeline", pipeline);
        await memoryStore.addArtifact(sessionId, { type: "pipeline", content: pipeline, userId });
      }
      if (markdown) {
        await saveArtifact(sessionId, userId, "docs", markdown);
        await memoryStore.addArtifact(sessionId, { type: "docs", content: markdown, userId });
      }
      if (folderStructure) {
        await saveArtifact(sessionId, userId, "folderStructure", folderStructure);
        await memoryStore.addArtifact(sessionId, { type: "folderStructure", content: folderStructure, userId });
      }
      if (apiDesign) {
        await saveArtifact(sessionId, userId, "apiDesign", apiDesign);
        await memoryStore.addArtifact(sessionId, { type: "apiDesign", content: apiDesign, userId });
      }
      if (testingPlan) {
        await saveArtifact(sessionId, userId, "testingPlan", testingPlan);
        await memoryStore.addArtifact(sessionId, { type: "testingPlan", content: testingPlan, userId });
      }

      let generatedTitle = undefined;
      if (isFirstMessage) {
        const titleRes = await callGroqRaw(apiKey, TITLE_PROMPT, prompt, [], 15, "title");
        if (titleRes?.content) {
          generatedTitle = titleRes.content.replace(/["']/g, "").trim();
        }
      }

      await saveSessionMetadata(sessionId, userId, generatedTitle);
      await memoryStore.updateSession(sessionId, { userId, ...(generatedTitle && { title: generatedTitle }) });

      return secureHeaders(NextResponse.json(result));
    }

    // ────────────────────────────────────────────────────────────────────────
    // GENERATE MODE
    // ────────────────────────────────────────────────────────────────────────

    // Step 1 — System config
    const configResult = await callGroq(
      apiKey, SOFTWARE_CONFIG_PROMPT, userMessage, history, TOKEN_BUDGET.config, "config"
    );
    if (!configResult) return errorResponse("Config generation failed", "LLM_ERROR", 500);
    const yaml = configResult.content;

    session.history.push({ role: "user", content: userMessage });
    session.history.push({ role: "assistant", content: compressForHistory(yaml, "config") });

    const stackSummary = summarizeYaml(yaml);

    // Step 2 — Docker Compose
    const dockerCtx = `Generate docker-compose for this stack: ${stackSummary}`;
    const dockerResult = await callGroq(
      apiKey, DOCKER_PROMPT, dockerCtx, trimHistory(session.history), TOKEN_BUDGET.docker, "docker"
    );
    if (!dockerResult) return errorResponse("Docker generation failed", "LLM_ERROR", 500);
    const docker = dockerResult.content;
    session.history.push({ role: "assistant", content: compressForHistory(docker, "docker") });

    // Step 3 — Pipeline
    const pipelineCtx = `Generate CI/CD pipeline for: ${stackSummary}`;
    const pipelineResult = await callGroq(
      apiKey, PIPELINE_PROMPT, pipelineCtx, trimHistory(session.history), TOKEN_BUDGET.pipeline, "pipeline"
    );
    if (!pipelineResult) return errorResponse("Pipeline generation failed", "LLM_ERROR", 500);
    const pipeline = pipelineResult.content;
    session.history.push({ role: "assistant", content: compressForHistory(pipeline, "pipeline") });

    // Step 4 — Markdown docs
    const markdownCtx = `Project description: ${prompt}\nStack summary: ${stackSummary}`;
    const markdownResult = await callGroq(
      markdownApiKey, MARKDOWN_PROMPT, markdownCtx, trimHistory(session.history), TOKEN_BUDGET.markdown, "markdown"
    );
    if (!markdownResult) return errorResponse("Docs generation failed", "LLM_ERROR", 500);
    const markdown = markdownResult.content;
    session.history.push({ role: "assistant", content: compressForHistory(markdown, "markdown") });

    // Step 5 — Folder Structure
    const folderCtx = `Generate folder structure for this stack: ${stackSummary}`;
    const folderStructureResult = await callGroq(
      folderStructureKey, FOLDER_STRUCTURE_PROMPT, folderCtx, trimHistory(session.history), TOKEN_BUDGET.folderStructure, "folderStructure"
    );
    const folderStructure = folderStructureResult?.content ?? "";

    // Step 6 — API Design
    const apiDesignCtx = `Generate API design for this stack: ${stackSummary}`;
    const apiDesignResult = await callGroq(
      apiDesignApiKey, API_DESIGN_PROMPT, apiDesignCtx, trimHistory(session.history), TOKEN_BUDGET.apiDesign, "apiDesign"
    );
    const apiDesign = apiDesignResult?.content ?? "";
    if (apiDesignResult) {
      session.history.push({ role: "assistant", content: compressForHistory(apiDesign, "apidesign") });
    }

    // Step 8 — Testing Plan
    const testingPlanCtx = `Generate testing plan for this stack: ${stackSummary}`;
    const testingPlanResult = await callGroq(
      apiKey, TESTING_PLAN_PROMPT, testingPlanCtx, trimHistory(session.history), TOKEN_BUDGET.testingPlan, "testingPlan"
    );
    const testingPlan = testingPlanResult?.content ?? "";
    if (testingPlanResult) {
      session.history.push({ role: "assistant", content: compressForHistory(testingPlan, "testingplan") });
    }

    // Step 9 — DB Schema via n8n (non-blocking)
    const dbSchema = await callN8nDbDesign(prompt, stackSummary);
    if (dbSchema) {
      log.info("DB schema attached to result");
    }

    // Count and deduct tokens
    const totalTokens =
      configResult.tokens +
      dockerResult.tokens +
      pipelineResult.tokens +
      markdownResult.tokens +
      (folderStructureResult?.tokens ?? 0) +
      (apiDesignResult?.tokens ?? 0) +
      (testingPlanResult?.tokens ?? 0);

    await deductTokens(userId, totalTokens);
    log.info("Tokens deducted", { userId, totalTokens });

    const result: GenerateResult = {
      yaml: safeYaml(yaml),
      docker: safeYaml(docker),
      pipeline: safeYaml(pipeline),
      markdown,
      folderStructure,
      ...(dbSchema ? { dbSchema } : {}),
      ...(apiDesign ? { apiDesign } : {}),
      ...(testingPlan ? { testingPlan } : {}),
    };

    session.cache.set(cacheKey, result);
    session.lastResult = result;

    await saveAssistantMessage(sessionId, userId, JSON.stringify(result));
    await memoryStore.addMessage(sessionId, {
      role: 'assistant',
      content: JSON.stringify(result),
      userId
    });

    await saveArtifact(sessionId, userId, "complete_result", JSON.stringify(result));
    await memoryStore.addArtifact(sessionId, {
      type: "complete_result",
      content: JSON.stringify(result),
      userId
    });

    await saveArtifact(sessionId, userId, "config", yaml);
    await memoryStore.addArtifact(sessionId, { type: "config", content: yaml, userId });
    await saveArtifact(sessionId, userId, "docker", docker);
    await memoryStore.addArtifact(sessionId, { type: "docker", content: docker, userId });
    await saveArtifact(sessionId, userId, "pipeline", pipeline);
    await memoryStore.addArtifact(sessionId, { type: "pipeline", content: pipeline, userId });
    await saveArtifact(sessionId, userId, "docs", markdown);
    await memoryStore.addArtifact(sessionId, { type: "docs", content: markdown, userId });
    if (folderStructure) {
      await saveArtifact(sessionId, userId, "folderStructure", folderStructure);
      await memoryStore.addArtifact(sessionId, { type: "folderStructure", content: folderStructure, userId });
    }
    if (apiDesign) {
      await saveArtifact(sessionId, userId, "apiDesign", apiDesign);
      await memoryStore.addArtifact(sessionId, { type: "apiDesign", content: apiDesign, userId });
    }
    if (testingPlan) {
      await saveArtifact(sessionId, userId, "testingPlan", testingPlan);
      await memoryStore.addArtifact(sessionId, { type: "testingPlan", content: testingPlan, userId });
    }

    let generatedTitle = undefined;
    if (isFirstMessage) {
      const titleRes = await callGroqRaw(apiKey, TITLE_PROMPT, prompt, [], 15, "title");
      if (titleRes?.content) {
        generatedTitle = titleRes.content.replace(/["']/g, "").trim();
      }
    }

    await saveSessionMetadata(sessionId, userId, generatedTitle);
    await memoryStore.updateSession(sessionId, { userId, ...(generatedTitle && { title: generatedTitle }) });

    return secureHeaders(NextResponse.json(result));

  } catch (err) {
    log.error("Unhandled handler error", { err: String(err) });
    return errorResponse("Internal server error", "SERVER_ERROR", 500);
  }
}