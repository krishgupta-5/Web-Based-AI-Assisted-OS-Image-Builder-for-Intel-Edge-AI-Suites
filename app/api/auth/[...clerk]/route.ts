import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/firebase-admin";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    // FIX 1: Verify the session belongs to this user before returning messages
    const sessionDoc = await db.collection("sessions").doc(sessionId).get();
    if (!sessionDoc.exists) {
      return NextResponse.json({ messages: [] });
    }
    if (sessionDoc.data()?.userId !== userId) {
      return new Response("Forbidden", { status: 403 });
    }

    let messagesSnapshot;
    try {
      messagesSnapshot = await db
        .collection("sessions")
        .doc(sessionId)
        .collection("messages")
        .get();
    } catch (error) {
      console.error("Failed to fetch messages from Firestore:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    const messages = messagesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
      };
    });

    messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Failed to load chat history:", error);
    return NextResponse.json(
      { error: "Failed to load chat history" },
      { status: 500 }
    );
  }
}