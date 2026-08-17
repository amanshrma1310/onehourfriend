import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ensureDbTables } from "@/lib/db-init";

export async function GET() {
  try {
    await ensureDbTables();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ userOneId: user.id }, { userTwoId: user.id }],
      },
      include: {
        userOne: {
          select: {
            id: true,
            username: true,
            avatar: true,
            bio: true,
            mood: true,
            trustScore: true,
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
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const friends = friendships.map((f) => {
      const partner = f.userOneId === user.id ? f.userTwo : f.userOne;
      return {
        id: f.id,
        friendshipId: f.id,
        partner: partner,
        friend: partner,
        createdAt: f.createdAt,
        lastMessage: f.messages[0] || null,
      };
    });

    return NextResponse.json({ success: true, friends });
  } catch (error: any) {
    console.error("Friends get error:", error);
    return NextResponse.json({ error: "Failed to load friends" }, { status: 500 });
  }
}
