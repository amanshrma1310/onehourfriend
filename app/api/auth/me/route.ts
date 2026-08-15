import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Check for any active session
    const activeSession = await prisma.conversationSession.findFirst({
      where: {
        OR: [{ userOneId: user.id }, { userTwoId: user.id }],
        status: "ACTIVE",
      },
      select: {
        id: true,
        intent: true,
        socialGroup: true,
        topic: true,
        mood: true,
        startedAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        activeRole: user.activeRole,
        preferredIntent: user.preferredIntent,
        preferredSocialGroup: user.preferredSocialGroup,
        mood: user.mood,
        trustScore: user.trustScore,
        karmaPoints: user.karmaPoints,
        totalSessionsAsGuider: user.totalSessionsAsGuider,
        totalSessionsAsSeeker: user.totalSessionsAsSeeker,
        createdAt: user.createdAt,
      },
      activeSession,
    });
  } catch (error: any) {
    console.error("Auth me error:", error);
    return NextResponse.json({ authenticated: false, user: null });
  }
}
