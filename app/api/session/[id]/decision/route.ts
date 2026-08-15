import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { keepConnection = false, rating = 5, badges = [], comment = "" } = body;

    const session = await prisma.conversationSession.findUnique({
      where: { id },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.userOneId !== user.id && session.userTwoId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isUserOne = session.userOneId === user.id;
    const partnerId = isUserOne ? session.userTwoId : session.userOneId;

    // Update user's keep decision
    const updatedSession = await prisma.conversationSession.update({
      where: { id },
      data: {
        ...(isUserOne ? { userOneKept: keepConnection } : { userTwoKept: keepConnection }),
        status: "COMPLETED",
        endedAt: session.endedAt || new Date(),
      },
    });

    // Save rating if provided
    if (rating && partnerId) {
      await prisma.rating.upsert({
        where: {
          sessionId_fromUserId: {
            sessionId: id,
            fromUserId: user.id,
          },
        },
        create: {
          sessionId: id,
          fromUserId: user.id,
          toUserId: partnerId,
          value: Math.min(5, Math.max(1, rating)),
          badges: Array.isArray(badges) ? badges.join(",") : "",
          comment,
        },
        update: {
          value: Math.min(5, Math.max(1, rating)),
          badges: Array.isArray(badges) ? badges.join(",") : "",
          comment,
        },
      });

      // Update partner's karma and trust score
      await prisma.user.update({
        where: { id: partnerId },
        data: {
          karmaPoints: { increment: rating * 5 },
        },
      });
    }

    // Check if mutual keep decision achieved
    const mutualKeep = updatedSession.userOneKept && updatedSession.userTwoKept;

    if (mutualKeep) {
      // Create Friendship between the two users
      const u1 = session.userOneId < session.userTwoId ? session.userOneId : session.userTwoId;
      const u2 = session.userOneId < session.userTwoId ? session.userTwoId : session.userOneId;

      await prisma.friendship.upsert({
        where: {
          userOneId_userTwoId: {
            userOneId: u1,
            userTwoId: u2,
          },
        },
        create: {
          userOneId: u1,
          userTwoId: u2,
        },
        update: {},
      });
    }

    return NextResponse.json({
      success: true,
      myKeptDecision: keepConnection,
      partnerKeptDecision: isUserOne ? updatedSession.userTwoKept : updatedSession.userOneKept,
      mutualKeep,
    });
  } catch (error: any) {
    console.error("Session decision error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit decision" },
      { status: 500 }
    );
  }
}
