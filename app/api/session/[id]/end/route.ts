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

    const session = await prisma.conversationSession.findUnique({
      where: { id },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.userOneId !== user.id && session.userTwoId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.conversationSession.update({
      where: { id },
      data: {
        status: "COMPLETED",
        endedAt: new Date(),
      },
    });

    // Add a system notice message
    await prisma.message.create({
      data: {
        sessionId: id,
        userId: user.id,
        content: `👋 ${user.username} has ended this conversation session.`,
        type: "SYSTEM",
      },
    });

    return NextResponse.json({ success: true, session: updated });
  } catch (error: any) {
    console.error("End session error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to end session" },
      { status: 500 }
    );
  }
}
