import { NextResponse } from "next/server";
import YAML from "yaml";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface GenerateResult {
  yaml: string;
  docker: string;
  pipeline: string;
  markdown: string;
}

// ─────────────────────────────────────────────
// Cache
// ─────────────────────────────────────────────
const cache = new Map<string, GenerateResult>();
let lastResult: GenerateResult | null = null;

// ─────────────────────────────────────────────
// PROMPTS — tuned for llama-3.1-8b-instant
// llama-3.1-8b-instant: fast, instruction-following,
// excels at structured output when format is rigid & explicit.
// Weakness: tends to hallucinate keys & add prose if not
// constrained with hard "NO" rules and a concrete example.
// ─────────────────────────────────────────────

const SOFTWARE_CONFIG_PROMPT = `You are a senior software architect. Output ONLY valid YAML. No prose. No markdown fences. No comments. No extra keys.

Output this exact structure, filling every value based on the user's request:

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
  port: <number or null>

database:
  primary: <postgresql|mongodb|mysql|redis|sqlite>
  cache: <redis|memcached|none>

auth:
  strategy: <jwt|oauth2|session|none>

infra:
  deployment: <docker|kubernetes|serverless>
  ci_cd: <github-actions|gitlab-ci|none>

RULES:
- Output only the YAML block above. Nothing else.
- Do NOT wrap in markdown code fences.
- Do NOT add comments or explanations.
- All values must be concrete strings or numbers — never null unless specified.
- Infer sensible defaults from the user's description.
- No hardware, no edge AI, no physical devices.`;

const DOCKER_PROMPT = `You are a DevOps engineer. Output ONLY a valid docker-compose.yaml. No prose. No markdown fences. No comments outside YAML.

Rules:
- version: "3.8"
- Include backend service and primary database service.
- Use official Docker Hub images (e.g. postgres:15-alpine, mongo:7, node:20-alpine).
- Add environment variables, volumes, and depends_on where appropriate.
- Expose correct ports.
- Add a healthcheck for the database service.
- Do NOT include explanations, headers, or markdown fences.
- Output raw YAML only.`;

const PIPELINE_PROMPT = `You are a software architect. Output ONLY valid YAML describing a software data pipeline. No prose. No markdown fences.

Output this exact structure:

pipeline:
  name: <system-name>
  version: "1.0.0"
  trigger: <continuous|on-request|scheduled>
  steps:
    - id: ingest
      title: <human label>
      type: <source|transform|storage|output>
      description: <one sentence>
    - id: process
      title: <human label>
      type: transform
      description: <one sentence>
    - id: store
      title: <human label>
      type: storage
      description: <one sentence>
    - id: respond
      title: <human label>
      type: output
      description: <one sentence>
  flow: "ingest -> process -> store -> respond"

RULES:
- Output ONLY the YAML above. Nothing else.
- Do NOT wrap in markdown fences.
- Match step names to the user's actual system.
- No hardware, no edge AI.`;

const MARKDOWN_PROMPT = `You are a senior software architect writing a README.md for a project.

Write clean, well-structured Markdown documentation. Do NOT wrap the output in a code block or markdown fence — output raw Markdown directly.

Include these sections in order:
# <Project Name>
A one-paragraph overview of what this system does and who it's for.

## Architecture
Explain the architecture pattern and how components connect (2–4 sentences).

## Tech Stack
List the key technologies with a one-line description for each (use a Markdown list).

## Features
Bullet list of the 5–8 most important features of the system.

## API Overview
If the system has an API, list the main endpoint groups (e.g. POST /auth/login, GET /users/:id) with one-line descriptions. Skip this section if there's no API.

## Getting Started
Brief instructions to run the project locally (assume Docker is available).

RULES:
- Output raw Markdown only. No code fences wrapping the entire document.
- No dummy filler text. Every line must be specific to the user's system.
- Keep it concise and professional.`;

// ─────────────────────────────────────────────
// Safe YAML validator
// ─────────────────────────────────────────────
function safeYaml(yaml: string) {
  try {
    YAML.parse(yaml);
    return yaml;
  } catch (e) {
    console.warn("YAML parse warning — returning raw output anyway");
    return yaml;
  }
}

// ─────────────────────────────────────────────
// Strip markdown fences the model may emit
// despite instructions (llama-3.1-8b quirk)
// ─────────────────────────────────────────────
function stripFences(text: string): string {
  return text
    .replace(/^```(?:yaml|yml|json|markdown|md)?\s*/gim, "")
    .replace(/^```\s*/gim, "")
    .replace(/```\s*$/gim, "")
    .trim();
}

// ─────────────────────────────────────────────
// Sleep helper
// ─────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────
// Groq API call — llama-3.1-8b-instant
// Retries up to MAX_RETRIES times on rate-limit (429).
// Uses exponential backoff: 3s → 6s → 12s.
// Free tier limit: 6000 TPM — parallel calls burn it instantly,
// so calls must be sequential (see handler below).
// ─────────────────────────────────────────────
const MAX_RETRIES = 3;

async function callGroq(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  // Per-artifact token budget. Keep low to stay under 6000 TPM
  // when calls are sequential: yaml~400, docker~500, pipeline~350, md~600.
  maxTokens = 512
): Promise<string | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.1,
          max_tokens: maxTokens,
          top_p: 0.9,
          stop: ["```", "\n\n\n"],
        }),
      });

      // Rate limited — parse retry-after header or fall back to backoff
      if (res.status === 429) {
        const retryAfterHeader = res.headers.get("retry-after");
        const waitMs = retryAfterHeader
          ? parseFloat(retryAfterHeader) * 1000
          : Math.pow(2, attempt) * 3000; // 3s, 6s, 12s

        console.warn(`Groq rate limited. Retrying in ${waitMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);

        if (attempt < MAX_RETRIES) {
          await sleep(waitMs);
          continue;
        } else {
          console.error("Groq rate limit: max retries exhausted");
          return null;
        }
      }

      if (!res.ok) {
        const err = await res.text();
        console.error("Groq API error:", err);
        return null;
      }

      const data = await res.json();
      const raw = data?.choices?.[0]?.message?.content ?? "";
      return stripFences(raw);
    } catch (err) {
      console.error("Groq fetch error:", err);
      if (attempt < MAX_RETRIES) {
        await sleep(Math.pow(2, attempt) * 2000);
        continue;
      }
      return null;
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────
export async function POST(req: Request) {
  const body = await req.json();
  const { prompt, mode, previous } = body;

  if (!prompt) {
    return NextResponse.json({ error: "Prompt required" }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing GROQ_API_KEY" },
      { status: 500 }
    );
  }

  // Cache key — skip cache on modify mode
  const key = prompt.toLowerCase().trim();
  if (mode !== "modify" && cache.has(key)) {
    return NextResponse.json(cache.get(key));
  }

  const userMessage =
    mode === "modify" && previous
      ? `Current configuration:\n${previous}\n\nRequested changes: ${prompt}`
      : prompt;

  try {
    // ── MODIFY MODE: only regenerate yaml, reuse other artifacts ────────────
    // This halves token usage and avoids burning the rate limit on
    // artifacts that haven't changed (docker/pipeline/docs stay the same).
    if (mode === "modify" && previous) {
      const yaml = await callGroq(apiKey, SOFTWARE_CONFIG_PROMPT, userMessage, 512);

      if (!yaml) {
        return NextResponse.json(
          { error: "Config regeneration failed" },
          { status: 500 }
        );
      }

      // Merge updated yaml with cached artifacts from previous result
      // Reuse docker/pipeline/markdown from the last full generation.
      // cache.get(key) fails here — the modify prompt is a different string
      // from the original prompt key, so it always returns undefined.
      // lastResult always holds the most recent complete artifact set.
      const base = lastResult ?? ({} as Partial<GenerateResult>);
      const result: GenerateResult = {
        yaml: safeYaml(yaml),
        docker: base.docker ?? "",
        pipeline: base.pipeline ?? "",
        markdown: base.markdown ?? "",
      };

      // Update lastResult so chained modifies work correctly
      lastResult = result;
      return NextResponse.json(result);
    }

    // ── GENERATE MODE: sequential calls to stay under 6000 TPM ─────────────
    // Promise.all fires all 4 concurrently (~2400 tokens at once) which trips
    // the free-tier 6000 TPM limit. Sequential adds ~4s latency but is safe.
    const yaml = await callGroq(apiKey, SOFTWARE_CONFIG_PROMPT, userMessage, 512);
    if (!yaml) return NextResponse.json({ error: "Config generation failed" }, { status: 500 });

    const docker = await callGroq(apiKey, DOCKER_PROMPT, userMessage, 600);
    if (!docker) return NextResponse.json({ error: "Docker generation failed" }, { status: 500 });

    const pipeline = await callGroq(apiKey, PIPELINE_PROMPT, userMessage, 400);
    if (!pipeline) return NextResponse.json({ error: "Pipeline generation failed" }, { status: 500 });

    const markdown = await callGroq(apiKey, MARKDOWN_PROMPT, userMessage, 700);
    if (!markdown) return NextResponse.json({ error: "Docs generation failed" }, { status: 500 });

    const result: GenerateResult = {
      yaml: safeYaml(yaml),
      docker: safeYaml(docker),
      pipeline: safeYaml(pipeline),
      markdown,
    };

    // Store in cache (repeat identical prompts) AND lastResult (modify mode)
    cache.set(key, result);
    lastResult = result;
    return NextResponse.json(result);
  } catch (err) {
    console.error("Handler error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}