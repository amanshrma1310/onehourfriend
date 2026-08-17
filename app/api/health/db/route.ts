import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const urlObj = new URL(request.url);
  const shouldInit = urlObj.searchParams.get("init") === "true";

  const rawUrl = process.env.DATABASE_URL || "NOT_SET (using fallback)";
  const maskedUrl = rawUrl.replace(/:([^:@]+)@/, ":****@");

  if (shouldInit) {
    try {
      // Redirect to /api/init-db
      const baseUrl = urlObj.origin;
      const initRes = await fetch(`${baseUrl}/api/init-db`);
      const initData = await initRes.json();
      return NextResponse.json({
        status: "INITIALIZED",
        details: initData,
      });
    } catch (e: any) {
      return NextResponse.json({ status: "INIT_FAILED", error: e.message }, { status: 500 });
    }
  }

  try {
    const userCount = await prisma.user.count();

    return NextResponse.json({
      status: "CONNECTED",
      database: "MySQL / MariaDB",
      connectionUrl: maskedUrl,
      userCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "TABLES_MISSING_OR_ERROR",
        error: error.message || "Unknown database error",
        errorCode: error.code || null,
        connectionUrl: maskedUrl,
        fix: "Visit /api/init-db in your browser to automatically create all missing tables with 1 click!",
      },
      { status: 500 }
    );
  }
}
