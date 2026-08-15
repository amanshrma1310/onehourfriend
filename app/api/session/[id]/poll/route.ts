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
    const url = new URL(req.url);
    const after = url.searchParams.get("after");

    const session = await prisma.conversationSession.findUnique({
      where: { id },
      select: {
        id: true,
        userOneId: true,
        userTwoId: true,
        status: true,
        expiresAt: true,
        userOneKept: true,
        userTwoKept: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.userOneId !== user.id && session.userTwoId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isUserOne = session.userOneId === user.id;
    const partnerKeptDecision = isUserOne ? session.userTwoKept : session.userOneKept;
    const myKeptDecision = isUserOne ? session.userOneKept : session.userTwoKept;

    // Check timer expiration
    let currentStatus = session.status;
    if (currentStatus === "ACTIVE" && session.expiresAt && new Date() >= new Date(session.expiresAt)) {
      currentStatus = "COMPLETED";
      await prisma.conversationSession.update({
        where: { id },
        data: { status: "COMPLETED", endedAt: new Date() },
      });
    }

    // Query messages created after timestamp
    const whereClause: any = { sessionId: id };
    if (after) {
      const afterDate = new Date(after);
      if (!isNaN(afterDate.getTime())) {
        whereClause.createdAt = { gt: afterDate };
      }
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    return NextResponse.json({
      status: currentStatus,
      messages,
      myKeptDecision,
      partnerKeptDecision,
      mutualKeep: myKeptDecision && partnerKeptDecision,
    });
  } catch (error: any) {
    console.error("Poll error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to poll session" },
      { status: 500 }
    );
  }
}
