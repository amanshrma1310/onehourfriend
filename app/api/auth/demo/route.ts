import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";
import { DEMO_USERS } from "@/lib/data";
import { ensureDbTables } from "@/lib/db-init";

export async function POST(req: Request) {
  try {
    await ensureDbTables();

    const { index = 0 } = await req.json();
    const demoData = DEMO_USERS[index % DEMO_USERS.length];

    let user = await prisma.user.findUnique({
      where: { username: demoData.username },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          username: demoData.username,
          email: demoData.email,
          avatar: demoData.avatar,
          bio: demoData.bio,
          activeRole: demoData.role,
          preferredIntent: demoData.intent,
          preferredSocialGroup: demoData.socialGroup,
          mood: demoData.mood,
          trustScore: 5.0,
          karmaPoints: 150,
        },
      });
    }

    await setSessionCookie({
      userId: user.id,
      username: user.username!,
      avatar: user.avatar,
      activeRole: user.activeRole,
      intent: user.preferredIntent,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        activeRole: user.activeRole,
        intent: user.preferredIntent,
      },
    });
  } catch (error: any) {
    console.error("Demo login error:", error);
    return NextResponse.json(
      { error: error.message || "Failed demo login" },
      { status: 500 }
    );
  }
}
