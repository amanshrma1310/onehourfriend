import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ensureCompanionUserExists, COMPANION_BOT_ID } from "@/lib/ai-companion";
import { ensureDbTables } from "@/lib/db-init";

export async function POST(req: Request) {
  try {
    await ensureDbTables();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      intent = user.preferredIntent || "PEACE",
      socialGroup = "OPEN",
      mood = "Need to talk",
      problemSummary = "",
      fallbackToCompanion = false,
    } = body;

    // 1. Clean up stale queue entries older than 10 minutes
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    await prisma.matchQueue.deleteMany({
      where: { enteredAt: { lt: tenMinsAgo } },
    });

    // 2. Check if user already has an active session
    const existingSession = await prisma.conversationSession.findFirst({
      where: {
        OR: [{ userOneId: user.id }, { userTwoId: user.id }],
        status: "ACTIVE",
      },
    });

    if (existingSession) {
      return NextResponse.json({
        matched: true,
        sessionId: existingSession.id,
      });
    }

    // 3. Fallback to AI Companion
    if (fallbackToCompanion) {
      await ensureCompanionUserExists();

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes
      const session = await prisma.conversationSession.create({
        data: {
          userOneId: user.id,
          userTwoId: COMPANION_BOT_ID,
          roleOne: "MEMBER",
          roleTwo: "MEMBER",
          intent,
          socialGroup,
          topic: mood,
          mood,
          problemSummary,
          status: "ACTIVE",
          expiresAt,
          isCompanion: true,
        },
      });

      // Add welcoming system message and companion starter
      await prisma.message.create({
        data: {
          sessionId: session.id,
          userId: COMPANION_BOT_ID,
          content: `🌟 Welcome to your 60-Minute Safe Space! This session is protected under the ${
            intent === "PEACE"
              ? "🕊️ Peace & Healing Zone"
              : intent === "GUIDANCE"
              ? "🧭 Guidance & Growth Zone"
              : intent === "SPARK"
              ? "✨ Spark & Chemistry Zone"
              : "☕ Casual Friendship Zone"
          }. You have exactly 60 minutes.`,
          type: "SYSTEM",
        },
      });

      await prisma.message.create({
        data: {
          sessionId: session.id,
          userId: COMPANION_BOT_ID,
          content: `Hello! I'm Aura, your friendly listener. Take a deep breath — this is a safe, confidential space. What's on your mind?`,
          type: "TEXT",
        },
      });

      await prisma.matchQueue.deleteMany({ where: { userId: user.id } });

      return NextResponse.json({
        matched: true,
        sessionId: session.id,
        isCompanion: true,
      });
    }

    // 4. FIND ANY CANDIDATE WAITING IN THE EXACT SAME CATEGORY
    const candidate = await prisma.matchQueue.findFirst({
      where: {
        userId: { not: user.id },
        intent: intent,
      },
      orderBy: { enteredAt: "asc" },
    });

    if (candidate) {
      // Pair with the candidate in the same category!
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

      const session = await prisma.conversationSession.create({
        data: {
          userOneId: candidate.userId,
          userTwoId: user.id,
          roleOne: "MEMBER",
          roleTwo: "MEMBER",
          intent: intent,
          socialGroup: "OPEN",
          topic: mood || candidate.mood,
          mood: mood || candidate.mood,
          problemSummary: problemSummary || candidate.problemSummary,
          status: "ACTIVE",
          expiresAt,
          isCompanion: false,
        },
      });

      // Delete both from match queue
      await prisma.matchQueue.deleteMany({
        where: {
          userId: { in: [user.id, candidate.userId] },
        },
      });

      // Welcome message
      await prisma.message.create({
        data: {
          sessionId: session.id,
          userId: user.id,
          content: `🌟 Matched! You are both connected in the ${
            intent === "PEACE"
              ? "🕊️ Peace & Healing Zone"
              : intent === "GUIDANCE"
              ? "🧭 Guidance & Mentorship Zone"
              : intent === "SPARK"
              ? "✨ Spark & Chemistry Zone"
              : "☕ Casual Friendship Zone"
          }. Say hi to start your 60 minutes!`,
          type: "SYSTEM",
        },
      });

      return NextResponse.json({
        matched: true,
        sessionId: session.id,
        isCompanion: false,
      });
    }

    // 5. No candidate yet: save user in queue with their selected category
    await prisma.matchQueue.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        role: "MEMBER",
        intent: intent,
        socialGroup: "OPEN",
        mood: mood,
        problemSummary: problemSummary,
      },
      update: {
        role: "MEMBER",
        intent: intent,
        socialGroup: "OPEN",
        mood: mood,
        problemSummary: problemSummary,
        enteredAt: new Date(),
      },
    });

    return NextResponse.json({
      matched: false,
      status: "WAITING",
      message: `Searching for an active friend in ${intent}...`,
    });
  } catch (error: any) {
    console.error("Match queue error:", error);
    return NextResponse.json(
      { error: error.message || "Matchmaking error" },
      { status: 500 }
    );
  }
}
