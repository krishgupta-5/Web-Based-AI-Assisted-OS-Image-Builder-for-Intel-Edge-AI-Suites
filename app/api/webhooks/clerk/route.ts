import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { createOrUpdateUser } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response("Error occurred -- no svix headers", {
        status: 400,
      });
    }

    const payload = await req.json();
    const body = JSON.stringify(payload);

    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);

    let evt: any;

    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err) {
      console.error("Webhook verification failed:", err);
      return new Response("Error occurred -- verification failed", {
        status: 400,
      });
    }

    const { type } = evt;

    if (type === "user.created") {
      const user = evt.data;
      
      // Create user in Firebase
      await createOrUpdateUser(user.id, {
        email: user.email_addresses[0]?.email_address,
        firstName: user.first_name,
        lastName: user.last_name,
        fullName: `${user.first_name || ""} ${user.last_name || ""}`.trim() || null,
        username: user.username,
        imageUrl: user.image_url,
        emailVerified: user.email_addresses[0]?.verification?.status === "verified",
        // Clerk-specific data
        rawClaims: user,
        azp: 'clerk',
      });

      console.log(`User ${user.id} created in Firebase via Clerk webhook`);
    }

    if (type === "user.updated") {
      const user = evt.data;
      
      // Update user in Firebase
      await createOrUpdateUser(user.id, {
        email: user.email_addresses[0]?.email_address,
        firstName: user.first_name,
        lastName: user.last_name,
        fullName: `${user.first_name || ""} ${user.last_name || ""}`.trim() || null,
        username: user.username,
        imageUrl: user.image_url,
        emailVerified: user.email_addresses[0]?.verification?.status === "verified",
        rawClaims: user,
        azp: 'clerk',
      });

      console.log(`User ${user.id} updated in Firebase via Clerk webhook`);
    }

    return NextResponse.json({ message: "Webhook processed" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
