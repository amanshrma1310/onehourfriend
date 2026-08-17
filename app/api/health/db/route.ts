import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rawUrl = process.env.DATABASE_URL || "NOT_SET (using fallback)";
    // Mask password for safety
    const maskedUrl = rawUrl.replace(/:([^:@]+)@/, ":****@");

    const userCount = await prisma.user.count();

    return NextResponse.json({
      status: "CONNECTED",
      database: "MySQL / MariaDB",
      connectionUrl: maskedUrl,
      userCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const rawUrl = process.env.DATABASE_URL || "NOT_SET (using fallback)";
    const maskedUrl = rawUrl.replace(/:([^:@]+)@/, ":****@");

    return NextResponse.json(
      {
        status: "CONNECTION_FAILED",
        error: error.message || "Unknown database error",
        errorCode: error.code || null,
        connectionUrl: maskedUrl,
        tips: [
          "1. Check if DATABASE_URL is set in Hostinger environment variables.",
          "2. Check if Hostinger database name & user require account prefix (e.g. u297792138_onehourfriend).",
          "3. Run 'npx prisma db push' to create tables.",
          "4. Verify MySQL host in Hostinger hPanel (127.0.0.1 or remote hostname).",
        ],
      },
      { status: 500 }
    );
  }
}
