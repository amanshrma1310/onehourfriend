import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { avatar, bio, activeRole, preferredIntent, preferredSocialGroup, mood } = body;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(avatar !== undefined && { avatar }),
        ...(bio !== undefined && { bio }),
        ...(activeRole !== undefined && { activeRole }),
        ...(preferredIntent !== undefined && { preferredIntent }),
        ...(preferredSocialGroup !== undefined && { preferredSocialGroup }),
        ...(mood !== undefined && { mood }),
      },
    });

    await setSessionCookie({
      userId: updated.id,
      username: updated.username!,
      avatar: updated.avatar,
      activeRole: updated.activeRole,
      intent: updated.preferredIntent,
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}
