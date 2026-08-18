import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ensureDbTables } from "@/lib/db-init";
import { randomUUID } from "crypto";

// GET: Fetch pending friend requests for current user
export async function GET() {
  try {
    await ensureDbTables();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requests = await prisma.friendRequest.findMany({
      where: {
        receiverId: user.id,
        status: "PENDING",
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
            bio: true,
            trustScore: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, requests });
  } catch (error: any) {
    console.error("Friend request GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch friend requests" }, { status: 500 });
  }
}

// POST: Send a friend request
export async function POST(req: Request) {
  try {
    await ensureDbTables();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { receiverId, receiverUsername } = body;

    let targetUserId = receiverId;

    if (!targetUserId && receiverUsername) {
      const targetUser = await prisma.user.findFirst({
        where: { username: receiverUsername.trim() },
        select: { id: true },
      });
      if (!targetUser) {
        return NextResponse.json({ error: "User not found with that username" }, { status: 404 });
      }
      targetUserId = targetUser.id;
    }

    if (!targetUserId) {
      return NextResponse.json({ error: "Missing receiver ID or username" }, { status: 400 });
    }

    if (targetUserId === user.id) {
      return NextResponse.json({ error: "You cannot send a friend request to yourself" }, { status: 400 });
    }

    // Check if they are already friends
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userOneId: user.id, userTwoId: targetUserId },
          { userOneId: targetUserId, userTwoId: user.id },
        ],
      },
    });

    if (existingFriendship) {
      return NextResponse.json({ error: "You are already connected friends!" }, { status: 400 });
    }

    // Check if request already exists
    const existingReq = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: user.id, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: user.id },
        ],
      },
    });

    if (existingReq) {
      if (existingReq.status === "PENDING") {
        if (existingReq.senderId === user.id) {
          return NextResponse.json({ message: "Friend request is already pending!" }, { status: 200 });
        } else {
          // If the other person already sent a request, auto-accept it!
          const userOneId = user.id < targetUserId ? user.id : targetUserId;
          const userTwoId = user.id < targetUserId ? targetUserId : user.id;

          await prisma.friendRequest.update({
            where: { id: existingReq.id },
            data: { status: "ACCEPTED" },
          });

          await prisma.friendship.upsert({
            where: { userOneId_userTwoId: { userOneId, userTwoId } },
            create: { userOneId, userTwoId },
            update: {},
          });

          return NextResponse.json({ success: true, message: "Mutual request accepted! You are now friends!" });
        }
      }
    }

    const newRequestId = randomUUID();
    await prisma.friendRequest.create({
      data: {
        id: newRequestId,
        senderId: user.id,
        receiverId: targetUserId,
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, message: "Friend request sent successfully!" });
  } catch (error: any) {
    console.error("Friend request POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to send friend request" }, { status: 500 });
  }
}

// PUT: Accept or Decline friend request
export async function PUT(req: Request) {
  try {
    await ensureDbTables();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { requestId, action } = body; // action: "ACCEPT" | "DECLINE"

    if (!requestId || !action) {
      return NextResponse.json({ error: "Missing requestId or action" }, { status: 400 });
    }

    const friendReq = await prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!friendReq || friendReq.receiverId !== user.id) {
      return NextResponse.json({ error: "Friend request not found" }, { status: 404 });
    }

    if (action === "ACCEPT") {
      await prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: "ACCEPTED" },
      });

      const userOneId = friendReq.senderId < user.id ? friendReq.senderId : user.id;
      const userTwoId = friendReq.senderId < user.id ? user.id : friendReq.senderId;

      await prisma.friendship.upsert({
        where: { userOneId_userTwoId: { userOneId, userTwoId } },
        create: { userOneId, userTwoId },
        update: {},
      });

      return NextResponse.json({ success: true, message: "Friend request accepted! You can now chat anytime." });
    } else {
      await prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: "DECLINED" },
      });

      return NextResponse.json({ success: true, message: "Friend request declined." });
    }
  } catch (error: any) {
    console.error("Friend request PUT error:", error);
    return NextResponse.json({ error: error.message || "Failed to update friend request" }, { status: 500 });
  }
}
