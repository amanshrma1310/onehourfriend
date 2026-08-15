import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.matchQueue.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({ success: true, cancelled: true });
  } catch (error: any) {
    console.error("Match cancel error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel match" },
      { status: 500 }
    );
  }
}
