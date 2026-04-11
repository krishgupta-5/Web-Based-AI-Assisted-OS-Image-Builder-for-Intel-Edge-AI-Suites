/**
 * lib/sessionId.ts
 *
 * Generates and persists a per-tab browser session ID in sessionStorage.
 * Each tab gets its own ID so conversation history never bleeds between tabs.
 *
 * Usage in ChatPanel:
 *   import { getSessionId } from "@/lib/sessionId";
 *
 *   fetch("/api/generate", {
 *     method: "POST",
 *     body: JSON.stringify({
 *       prompt,
 *       mode: isModifyMode ? "modify" : "generate",
 *       sessionId: getSessionId(),   // ← add this
 *     }),
 *   });
 *
 * Wire resetSessionId() to a "New Chat" button to clear server-side state.
 */

const SESSION_KEY = "edge-os-session-id";

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

/** Returns the current tab's session ID, creating one if it doesn't exist. */
export function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = generateId();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * Resets the session ID — call this on "New Chat".
 * The server will create a fresh session (blank history, no lastResult)
 * the next time a request arrives with the new ID.
 */
export function resetSessionId(): string {
  const id = generateId();
  if (typeof window !== "undefined") {
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}