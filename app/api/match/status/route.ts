import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ensureDbTables } from "@/lib/db-init";

export async function GET() {
  try {
    await ensureDbTables();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Check if user already has an active session created
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

    // 2. Check if user is in queue
    const myQueueEntry = await prisma.matchQueue.findUnique({
      where: { userId: user.id },
    });

    if (!myQueueEntry) {
      return NextResponse.json({
        matched: false,
        inQueue: false,
        status: "IDLE",
      });
    }

    // 3. Active Pair Search in the same category
    const candidate = await prisma.matchQueue.findFirst({
      where: {
        userId: { not: user.id },
        intent: myQueueEntry.intent,
      },
      orderBy: { enteredAt: "asc" },
    });

    if (candidate) {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

      const newSession = await prisma.conversationSession.create({
        data: {
          userOneId: myQueueEntry.userId,
          userTwoId: candidate.userId,
          roleOne: "MEMBER",
          roleTwo: "MEMBER",
          intent: myQueueEntry.intent,
          socialGroup: "OPEN",
          topic: myQueueEntry.mood || "General",
          mood: myQueueEntry.mood || "General",
          problemSummary: myQueueEntry.problemSummary || candidate.problemSummary,
          status: "ACTIVE",
          expiresAt,
          isCompanion: false,
        },
      });

      // Delete both from queue
      await prisma.matchQueue.deleteMany({
        where: {
          userId: { in: [user.id, candidate.userId] },
        },
      });

      // Create welcome message
      await prisma.message.create({
        data: {
          sessionId: newSession.id,
          userId: user.id,
          content: `🌟 Matched! You are both connected in the same category. Say hello to start!`,
          type: "SYSTEM",
        },
      });

      return NextResponse.json({
        matched: true,
        sessionId: newSession.id,
      });
    }

    return NextResponse.json({
      matched: false,
      inQueue: true,
      status: "WAITING",
    });
  } catch (error: any) {
    console.error("Match status error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check match status" },
      { status: 500 }
    );
  }
}
