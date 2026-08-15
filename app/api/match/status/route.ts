import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has an active session created (by another user pairing with them)
    const session = await prisma.conversationSession.findFirst({
      where: {
        OR: [{ userOneId: user.id }, { userTwoId: user.id }],
        status: "ACTIVE",
      },
    });

    if (session) {
      return NextResponse.json({
        matched: true,
        sessionId: session.id,
      });
    }

    // Check if still in queue
    const inQueue = await prisma.matchQueue.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({
      matched: false,
      inQueue: !!inQueue,
      status: inQueue ? "WAITING" : "IDLE",
    });
  } catch (error: any) {
    console.error("Match status error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check match status" },
      { status: 500 }
    );
  }
}
