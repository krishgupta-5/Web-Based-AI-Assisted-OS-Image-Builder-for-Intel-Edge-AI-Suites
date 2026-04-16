// lib/memory-store.ts
// FIX 3 & 7: Replaced in-memory Map with Firestore-backed store.
// The previous implementation lost ALL data on every serverless cold start
// (roughly every few minutes on Vercel). Now every read/write goes to Firestore
// so state survives restarts.

import { db } from "@/lib/firebase-admin";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  userId: string;
  createdAt: Date;
}

interface Artifact {
  id: string;
  type: string;
  content: string;
  userId: string;
  createdAt: Date;
}

interface Session {
  userId: string;
  updatedAt: Date;
}

class PersistentStore {
  // ── Messages ────────────────────────────────────────────────────────────────

  async addMessage(
    sessionId: string,
    message: Omit<Message, "id" | "createdAt">
  ): Promise<string> {
    const ref = await db
      .collection("sessions")
      .doc(sessionId)
      .collection("messages")
      .add({ ...message, createdAt: new Date() });
    return ref.id;
  }

  async getMessages(sessionId: string, userId: string): Promise<Message[]> {
    const snap = await db
      .collection("sessions")
      .doc(sessionId)
      .collection("messages")
      .where("userId", "==", userId)
      .get();

    return snap.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() ?? new Date(),
        } as Message;
      })
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  // ── Artifacts ────────────────────────────────────────────────────────────────

  async addArtifact(
    sessionId: string,
    artifact: Omit<Artifact, "id" | "createdAt">
  ): Promise<string> {
    const ref = await db
      .collection("sessions")
      .doc(sessionId)
      .collection("artifacts")
      .add({ ...artifact, createdAt: new Date() });
    return ref.id;
  }

  async getArtifacts(sessionId: string, userId: string): Promise<Artifact[]> {
    const snap = await db
      .collection("sessions")
      .doc(sessionId)
      .collection("artifacts")
      .where("userId", "==", userId)
      .get();

    return snap.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() ?? new Date(),
        } as Artifact;
      })
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  // ── Session metadata ─────────────────────────────────────────────────────────

  async updateSession(
    sessionId: string,
    session: Partial<Session>
  ): Promise<void> {
    await db
      .collection("sessions")
      .doc(sessionId)
      .set({ ...session, updatedAt: new Date() }, { merge: true });
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const doc = await db.collection("sessions").doc(sessionId).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    return {
      userId: data.userId,
      updatedAt: data.updatedAt?.toDate() ?? new Date(),
    };
  }

  async getUserSessions(
    userId: string
  ): Promise<
    { sessionId: string; updatedAt: Date; messageCount: number; lastMessage?: string }[]
  > {
    const snap = await db
      .collection("sessions")
      .where("userId", "==", userId)
      .get();

    const results = await Promise.all(
      snap.docs.map(async (doc) => {
        const sessionId = doc.id;
        const data = doc.data();

        const msgSnap = await db
          .collection("sessions")
          .doc(sessionId)
          .collection("messages")
          .get();

        const userMessages = msgSnap.docs
          .map((m) => m.data())
          .filter((m) => m.role === "user")
          .sort((a, b) => {
            const ta = a.createdAt?.toDate?.()?.getTime() ?? 0;
            const tb = b.createdAt?.toDate?.()?.getTime() ?? 0;
            return tb - ta;
          });

        return {
          sessionId,
          updatedAt: data.updatedAt?.toDate() ?? new Date(),
          messageCount: msgSnap.size,
          lastMessage: userMessages[0]?.content as string | undefined,
        };
      })
    );

    return results.sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }
}

export const memoryStore = new PersistentStore();