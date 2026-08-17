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
    const { roomId, type, payload = "{}" } = body;

    if (!roomId || !type) {
      return NextResponse.json({ error: "Missing roomId or type" }, { status: 400 });
    }

    const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);
    const signalId = randomUUID();

    // Insert signal into CallSignal
    await prisma.$executeRawUnsafe(
      "INSERT INTO `CallSignal` (`id`, `roomId`, `senderId`, `type`, `payload`, `createdAt`) VALUES (?, ?, ?, ?, ?, NOW(3))",
      signalId,
      roomId,
      user.id,
      type,
      payloadStr
    );

    // Clean up signals older than 5 minutes
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    await prisma.$executeRawUnsafe(
      "DELETE FROM `CallSignal` WHERE `createdAt` < ?",
      fiveMinsAgo
    );

    return NextResponse.json({ success: true, signalId });
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

    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
    }

    let sinceDate: Date;
    if (since) {
      const parsed = parseInt(since, 10);
      sinceDate = !isNaN(parsed) ? new Date(parsed) : new Date(Date.now() - 30 * 1000);
    } else {
      sinceDate = new Date(Date.now() - 30 * 1000);
    }

    const rows: any = await prisma.$queryRawUnsafe(
      "SELECT `id`, `roomId`, `senderId`, `type`, `payload`, `createdAt` FROM `CallSignal` WHERE `roomId` = ? AND `senderId` != ? AND `createdAt` > ? ORDER BY `createdAt` ASC LIMIT 50",
      roomId,
      user.id,
      sinceDate
    );

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
        type: row.type,
        payload: parsedPayload,
        createdAt: row.createdAt,
      };
    });

    return NextResponse.json({ success: true, signals });
  } catch (error: any) {
    console.error("Signal GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch signals" }, { status: 500 });
  }
}
