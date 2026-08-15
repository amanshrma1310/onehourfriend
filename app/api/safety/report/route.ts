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
    const { reportedUserId, reason = "OTHER", description = "" } = body;

    if (!reportedUserId) {
      return NextResponse.json({ error: "Reported user ID required" }, { status: 400 });
    }

    const report = await prisma.report.create({
      data: {
        reporterId: user.id,
        reportedUserId,
        reason,
        description,
        status: "PENDING",
      },
    });

    // Deduct trust score from reported user
    await prisma.user.update({
      where: { id: reportedUserId },
      data: {
        trustScore: { decrement: 0.5 },
      },
    });

    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    console.error("Safety report error:", error);
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }
}
