import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const session = await prisma.conversationSession.findUnique({
      where: { id },
      include: {
        userOne: {
          select: {
            id: true,
            username: true,
            avatar: true,
            bio: true,
            mood: true,
            trustScore: true,
            karmaPoints: true,
          },
        },
        userTwo: {
          select: {
            id: true,
            username: true,
            avatar: true,
            bio: true,
            mood: true,
            trustScore: true,
            karmaPoints: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          take: 100,
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Ensure current user is part of this session
    if (session.userOneId !== user.id && session.userTwoId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isUserOne = session.userOneId === user.id;
    const partner = isUserOne ? session.userTwo : session.userOne;
    const myRole = isUserOne ? session.roleOne : session.roleTwo;
    const partnerRole = isUserOne ? session.roleTwo : session.roleOne;
    const myKeptDecision = isUserOne ? session.userOneKept : session.userTwoKept;
    const partnerKeptDecision = isUserOne ? session.userTwoKept : session.userOneKept;

    // Calculate remaining seconds
    const now = new Date().getTime();
    const expiry = session.expiresAt ? new Date(session.expiresAt).getTime() : now + 60 * 60 * 1000;
    const remainingSeconds = Math.max(0, Math.floor((expiry - now) / 1000));

    return NextResponse.json({
      session: {
        id: session.id,
        intent: session.intent,
        socialGroup: session.socialGroup,
        topic: session.topic,
        mood: session.mood,
        problemSummary: session.problemSummary,
        status: session.status,
        startedAt: session.startedAt,
        expiresAt: session.expiresAt,
        remainingSeconds,
        isCompanion: session.isCompanion,
        myRole,
        partnerRole,
        myKeptDecision,
        partnerKeptDecision,
      },
      partner,
      messages: session.messages,
      currentUser: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
      },
    });
  } catch (error: any) {
    console.error("Session get error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load session" },
      { status: 500 }
    );
  }
}
