import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { checkRateLimit, getClientIp, isBotHoneypotTriggered, sanitizeText } from "@/lib/security";
import { ensureDbTables } from "@/lib/db-init";

export async function POST(req: Request) {
  try {
    await ensureDbTables();

    const ip = getClientIp(req);

    // 1. Anti-Brute Force Rate Limiting (max 10 login attempts per IP per minute)
    const rateCheck = checkRateLimit(`login_${ip}`, 10, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Please wait ${rateCheck.retryAfter}s before trying again.` },
        { status: 429 }
      );
    }

    const body = await req.json();

    // 2. Honeypot check
    if (isBotHoneypotTriggered(body)) {
      return NextResponse.json({ error: "Invalid login attempt" }, { status: 400 });
    }

    const { identifier, password } = body;
    const cleanIdentifier = sanitizeText(identifier, 100);

    if (!cleanIdentifier) {
      return NextResponse.json(
        { error: "Please enter your username or email" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanIdentifier },
          { email: cleanIdentifier },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this username or email" },
        { status: 401 }
      );
    }

    if (user.isBanned) {
      return NextResponse.json(
        { error: "This account has been suspended for safety violations" },
        { status: 403 }
      );
    }

    // Verify password if user has a password set
    if (user.passwordHash && password) {
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Incorrect password" },
          { status: 401 }
        );
      }
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
    console.error("Login error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to log in" },
      { status: 500 }
    );
  }
}
