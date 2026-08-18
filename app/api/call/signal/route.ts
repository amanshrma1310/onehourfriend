import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ensureDbTables } from "@/lib/db-init";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    await ensureDbTables();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { roomId, targetUserId = null, type, payload = "{}" } = body;

    if (!roomId || !type) {
      return NextResponse.json({ error: "Missing roomId or type" }, { status: 400 });
    }

    const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);
    const signalId = randomUUID();
    const nowMs = Date.now();

    // Insert signal into CallSignal
    try {
      await prisma.$executeRawUnsafe(
        "INSERT INTO `CallSignal` (`id`, `roomId`, `senderId`, `targetUserId`, `type`, `payload`, `timestamp`, `createdAt`) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(3))",
        signalId,
        roomId,
        user.id,
        targetUserId,
        type,
        payloadStr,
        nowMs
      );
    } catch {
      // Fallback if targetUserId column is still pending
      await prisma.$executeRawUnsafe(
        "INSERT INTO `CallSignal` (`id`, `roomId`, `senderId`, `type`, `payload`, `timestamp`, `createdAt`) VALUES (?, ?, ?, ?, ?, ?, NOW(3))",
        signalId,
        roomId,
        user.id,
        type,
        payloadStr,
        nowMs
      );
    }

    // Clean up signals older than 5 minutes
    const fiveMinsAgoMs = nowMs - 5 * 60 * 1000;
    try {
      await prisma.$executeRawUnsafe(
        "DELETE FROM `CallSignal` WHERE `timestamp` < ?",
        fiveMinsAgoMs
      );
    } catch {}

    return NextResponse.json({ success: true, signalId, timestamp: nowMs });
  } catch (error: any) {
    console.error("Signal POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to send signal" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await ensureDbTables();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const roomId = url.searchParams.get("roomId");
    const since = url.searchParams.get("since");
    const checkIncoming = url.searchParams.get("checkIncoming");

    const now = Date.now();
    let sinceMs: number = now - 30 * 1000;
    if (since) {
      const parsed = parseInt(since, 10);
      if (!isNaN(parsed) && parsed > 0) {
        sinceMs = parsed;
      }
    }

    let rows: any[] = [];

    if (roomId) {
      try {
        rows = await prisma.$queryRawUnsafe(
          "SELECT `id`, `roomId`, `senderId`, `targetUserId`, `type`, `payload`, `timestamp`, `createdAt` FROM `CallSignal` WHERE `roomId` = ? AND `senderId` != ? AND `timestamp` > ? ORDER BY `timestamp` ASC LIMIT 50",
          roomId,
          user.id,
          sinceMs
        );
      } catch {
        rows = await prisma.$queryRawUnsafe(
          "SELECT `id`, `roomId`, `senderId`, `type`, `payload`, `timestamp`, `createdAt` FROM `CallSignal` WHERE `roomId` = ? AND `senderId` != ? AND `timestamp` > ? ORDER BY `timestamp` ASC LIMIT 50",
          roomId,
          user.id,
          sinceMs
        );
      }
    } else if (checkIncoming === "true") {
      // Find all friendships for this user
      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [{ userOneId: user.id }, { userTwoId: user.id }],
        },
        select: { id: true },
      });

      const roomIds = friendships.map((f) => `friendship_${f.id}`);

      // Also check active session if any
      const activeSession = await prisma.conversationSession.findFirst({
        where: {
          OR: [{ userOneId: user.id }, { userTwoId: user.id }],
          status: "ACTIVE",
        },
        select: { id: true },
      });

      if (activeSession) {
        roomIds.push(`session_${activeSession.id}`);
      }

      // Check direct signals targeting this user or roomIds
      if (roomIds.length > 0) {
        const placeholders = roomIds.map(() => "?").join(",");
        try {
          const query = `SELECT \`id\`, \`roomId\`, \`senderId\`, \`targetUserId\`, \`type\`, \`payload\`, \`timestamp\`, \`createdAt\` FROM \`CallSignal\` WHERE (\`targetUserId\` = ? OR \`roomId\` IN (${placeholders})) AND \`senderId\` != ? AND \`type\` = 'CALL_RING' AND \`timestamp\` > ? ORDER BY \`timestamp\` DESC LIMIT 10`;
          rows = await prisma.$queryRawUnsafe(query, user.id, ...roomIds, user.id, sinceMs);
        } catch {
          const query = `SELECT \`id\`, \`roomId\`, \`senderId\`, \`type\`, \`payload\`, \`timestamp\`, \`createdAt\` FROM \`CallSignal\` WHERE \`roomId\` IN (${placeholders}) AND \`senderId\` != ? AND \`type\` = 'CALL_RING' AND \`timestamp\` > ? ORDER BY \`timestamp\` DESC LIMIT 10`;
          rows = await prisma.$queryRawUnsafe(query, ...roomIds, user.id, sinceMs);
        }
      } else {
        try {
          const query = "SELECT `id`, `roomId`, `senderId`, `targetUserId`, `type`, `payload`, `timestamp`, `createdAt` FROM `CallSignal` WHERE `targetUserId` = ? AND `senderId` != ? AND `type` = 'CALL_RING' AND `timestamp` > ? ORDER BY `timestamp` DESC LIMIT 10";
          rows = await prisma.$queryRawUnsafe(query, user.id, user.id, sinceMs);
        } catch {}
      }
    }

    const signals = (rows || []).map((row: any) => {
      let parsedPayload = {};
      try {
        parsedPayload = JSON.parse(row.payload);
      } catch {
        parsedPayload = row.payload;
      }
      return {
        id: row.id,
        roomId: row.roomId,
        senderId: row.senderId,
        targetUserId: row.targetUserId || null,
        type: row.type,
        payload: parsedPayload,
        timestamp: Number(row.timestamp || 0),
        createdAt: row.createdAt,
      };
    });

    return NextResponse.json({ success: true, signals });
  } catch (error: any) {
    console.error("Signal GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch signals" }, { status: 500 });
  }
}
