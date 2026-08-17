import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ensureDbTables } from "@/lib/db-init";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ friendshipId: string }> }
) {
  try {
    await ensureDbTables();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { friendshipId } = await params;

    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
    }

    if (friendship.userOneId !== user.id && friendship.userTwoId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const messages = await prisma.friendMessage.findMany({
      where: { friendshipId },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
    console.error("Friend messages get error:", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ friendshipId: string }> }
) {
  try {
    await ensureDbTables();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { friendshipId } = await params;
    const body = await req.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content cannot be empty" }, { status: 400 });
    }

    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
    }

    if (friendship.userOneId !== user.id && friendship.userTwoId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const message = await prisma.friendMessage.create({
      data: {
        friendshipId,
        senderId: user.id,
        content: content.trim(),
      },
    });

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    console.error("Friend message post error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
