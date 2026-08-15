import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ensureCompanionUserExists, COMPANION_BOT_ID } from "@/lib/ai-companion";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      role = user.activeRole || "PROBLEM_FACER",
      intent = user.preferredIntent || "PEACE",
      socialGroup = user.preferredSocialGroup || "OPEN",
      mood = user.mood || "Need to talk",
      problemSummary = "",
      fallbackToCompanion = false,
    } = body;

    // Check if user already has an active session
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

    // Instant Fallback to AI Companion requested
    if (fallbackToCompanion) {
      await ensureCompanionUserExists();

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes
      const session = await prisma.conversationSession.create({
        data: {
          userOneId: user.id,
          userTwoId: COMPANION_BOT_ID,
          roleOne: role,
          roleTwo: "GUIDER",
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
          content: `🌟 Welcome to your 60-Minute Safe Space! This session is protected under the ${intent === "PEACE" ? "🕊️ Peace & Healing Zone (Strictly Platonic)" : intent === "GUIDANCE" ? "🧭 Guidance Zone" : "☕ Casual Friendship Zone"}. You have exactly 60 minutes.`,
          type: "SYSTEM",
        },
      });

      await prisma.message.create({
        data: {
          sessionId: session.id,
          userId: COMPANION_BOT_ID,
          content: `Hello! I'm Aura, your compassionate listener today. I see you're feeling "${mood}". Take a deep breath — this is a safe, confidential space. What's on your mind?`,
          type: "TEXT",
        },
      });

      // Remove user from queue if present
      await prisma.matchQueue.deleteMany({ where: { userId: user.id } });

      return NextResponse.json({
        matched: true,
        sessionId: session.id,
        isCompanion: true,
      });
    }

    // Search for compatible candidate in queue
    let targetRoles: string[] = [];
    if (role === "PROBLEM_FACER") {
      targetRoles = ["GUIDER", "CASUAL_CHILL"];
    } else if (role === "GUIDER") {
      targetRoles = ["PROBLEM_FACER", "CASUAL_CHILL"];
    } else {
      targetRoles = ["CASUAL_CHILL", "PROBLEM_FACER", "GUIDER"];
    }

    // Candidate query: must match intent strictly, compatible role, not the user themselves, not blocked
    const candidate = await prisma.matchQueue.findFirst({
      where: {
        userId: { not: user.id },
        intent,
        role: { in: targetRoles },
        OR: [
          { socialGroup: "OPEN" },
          { socialGroup },
        ],
      },
      orderBy: { enteredAt: "asc" },
    });

    if (candidate) {
      // We found a human match!
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes
      
      const session = await prisma.conversationSession.create({
        data: {
          userOneId: user.id,
          userTwoId: candidate.userId,
          roleOne: role,
          roleTwo: candidate.role,
          intent,
          socialGroup,
          topic: mood,
          mood: `${mood} & ${candidate.mood}`,
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

      // Create welcome system message
      await prisma.message.create({
        data: {
          sessionId: session.id,
          userId: user.id,
          content: `🌟 Matched! You are in a 60-Minute Anonymous Conversation under the ${intent === "PEACE" ? "🕊️ Peace & Healing Zone" : intent === "GUIDANCE" ? "🧭 Guidance & Growth Zone" : "☕ Casual Friendship Zone"}. Be kind, respectful, and enjoy the conversation!`,
          type: "SYSTEM",
        },
      });

      return NextResponse.json({
        matched: true,
        sessionId: session.id,
        isCompanion: false,
      });
    }

    // No match found yet: save / update user in queue
    await prisma.matchQueue.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        role,
        intent,
        socialGroup,
        mood,
        problemSummary,
      },
      update: {
        role,
        intent,
        socialGroup,
        mood,
        problemSummary,
        enteredAt: new Date(),
      },
    });

    return NextResponse.json({
      matched: false,
      status: "WAITING",
      message: "Searching for your 60-minute partner...",
    });
  } catch (error: any) {
    console.error("Match queue error:", error);
    return NextResponse.json(
      { error: error.message || "Matchmaking error" },
      { status: 500 }
    );
  }
}
