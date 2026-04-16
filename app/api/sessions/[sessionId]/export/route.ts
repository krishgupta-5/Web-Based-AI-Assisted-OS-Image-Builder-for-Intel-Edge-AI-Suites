import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/firebase-admin";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { sessionId } = await params;

    // Verify the session belongs to this user
    const sessionDoc = await db.collection("sessions").doc(sessionId).get();
    if (!sessionDoc.exists || sessionDoc.data()?.userId !== userId) {
      return new Response("Forbidden", { status: 403 });
    }

    // Get all messages
    const messagesSnapshot = await db
      .collection("sessions")
      .doc(sessionId)
      .collection("messages")
      .orderBy("createdAt", "asc")
      .get();

    const messages = messagesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      };
    });

    // Get all artifacts
    const artifactsSnapshot = await db
      .collection("sessions")
      .doc(sessionId)
      .collection("artifacts")
      .orderBy("createdAt", "asc")
      .get();

    const artifacts = artifactsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      };
    });

    // Get session metadata
    const sessionData = sessionDoc.data();

    const exportData = {
      sessionId,
      metadata: {
        ...sessionData,
        updatedAt: sessionData?.updatedAt?.toDate?.() || sessionData?.updatedAt,
      },
      messages,
      artifacts,
      exportedAt: new Date(),
      exportedBy: userId,
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("Failed to export session:", error);
    return NextResponse.json(
      { error: "Failed to export session" },
      { status: 500 }
    );
  }
}
