import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/firebase-admin";

export async function DELETE(
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

    // Delete all subcollections
    const collections = ["messages", "artifacts"];
    await Promise.all(
      collections.map(async (collection) => {
        const snapshot = await db
          .collection("sessions")
          .doc(sessionId)
          .collection(collection)
          .get();
        
        await Promise.all(
          snapshot.docs.map((doc) => doc.ref.delete())
        );
      })
    );

    // Delete the session document
    await db.collection("sessions").doc(sessionId).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete session:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { sessionId } = await params;
    const body = await req.json();
    const { title } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Verify the session belongs to this user
    const sessionDoc = await db.collection("sessions").doc(sessionId).get();
    if (!sessionDoc.exists || sessionDoc.data()?.userId !== userId) {
      return new Response("Forbidden", { status: 403 });
    }

    // For now, we'll store the title as a custom field
    // In a real implementation, you might want to add a dedicated title field
    await db.collection("sessions").doc(sessionId).update({
      title,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, title });
  } catch (error) {
    console.error("Failed to rename session:", error);
    return NextResponse.json(
      { error: "Failed to rename session" },
      { status: 500 }
    );
  }
}
