import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { blockedUserId, sessionId } = body;

    if (!blockedUserId) {
      return NextResponse.json({ error: "Blocked user ID required" }, { status: 400 });
    }

    // Create block entry
    await prisma.block.upsert({
      where: {
        blockerId_blockedId: {
          blockerId: user.id,
          blockedId: blockedUserId,
        },
      },
      create: {
        blockerId: user.id,
        blockedId: blockedUserId,
      },
      update: {},
    });

    // If active session exists, end it immediately
    if (sessionId) {
      await prisma.conversationSession.update({
        where: { id: sessionId },
        data: {
          status: "CANCELLED",
          endedAt: new Date(),
        },
      });

      await prisma.message.create({
        data: {
          sessionId,
          userId: user.id,
          content: "🚫 This session has been terminated and the user has been blocked.",
          type: "SYSTEM",
        },
      });
    }

    return NextResponse.json({ success: true, blocked: true });
  } catch (error: any) {
    console.error("Safety block error:", error);
    return NextResponse.json({ error: "Failed to block user" }, { status: 500 });
  }
}
