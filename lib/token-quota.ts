import { db } from "@/lib/firebase-admin";

const DAILY_TOKEN_LIMIT = 10_000;
const QUOTA_TTL_MS = 24 * 60 * 60 * 1000;

export interface TokenQuota {
  userId: string;
  tokensUsed: number;
  tokensLimit: number;
  windowStart: number;
  exhausted: boolean;
}

export async function getOrCreateQuota(userId: string): Promise<TokenQuota> {
  const ref = db.collection("token_quotas").doc(userId);
  const snap = await ref.get();
  const now = Date.now();

  if (!snap.exists) {
    const quota: TokenQuota = {
      userId,
      tokensUsed: 0,
      tokensLimit: DAILY_TOKEN_LIMIT,
      windowStart: now,
      exhausted: false,
    };
    await ref.set(quota);
    return quota;
  }

  const data = snap.data() as TokenQuota;

  // Reset if 24h window has passed
  if (now - data.windowStart > QUOTA_TTL_MS) {
    const fresh: TokenQuota = {
      userId,
      tokensUsed: 0,
      tokensLimit: DAILY_TOKEN_LIMIT,
      windowStart: now,
      exhausted: false,
    };
    await ref.set(fresh);
    return fresh;
  }

  return data;
}

export async function deductTokens(
  userId: string,
  tokens: number
): Promise<{ ok: boolean; quota: TokenQuota }> {
  const ref = db.collection("token_quotas").doc(userId);
  const now = Date.now();

  // FIX 2: Wrap in a Firestore transaction so read-check-write is atomic.
  // Two concurrent requests can no longer both pass the limit check.
  return db.runTransaction(async (txn) => {
    const snap = await txn.get(ref);

    let quota: TokenQuota;
    if (!snap.exists) {
      quota = {
        userId,
        tokensUsed: 0,
        tokensLimit: DAILY_TOKEN_LIMIT,
        windowStart: now,
        exhausted: false,
      };
    } else {
      quota = snap.data() as TokenQuota;
      // Auto-reset inside transaction if window expired
      if (now - quota.windowStart > QUOTA_TTL_MS) {
        quota = {
          userId,
          tokensUsed: 0,
          tokensLimit: DAILY_TOKEN_LIMIT,
          windowStart: now,
          exhausted: false,
        };
      }
    }

    if (quota.exhausted || quota.tokensUsed + tokens > quota.tokensLimit) {
      txn.set(ref, { ...quota, exhausted: true }, { merge: true });
      return { ok: false, quota: { ...quota, exhausted: true } };
    }

    const newUsed = quota.tokensUsed + tokens;
    const exhausted = newUsed >= quota.tokensLimit;
    const updated: TokenQuota = { ...quota, tokensUsed: newUsed, exhausted };
    txn.set(ref, updated);
    return { ok: true, quota: updated };
  });
}