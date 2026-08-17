import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { checkRateLimit, getClientIp, isBotHoneypotTriggered, sanitizeText } from "@/lib/security";
import { ensureDbTables } from "@/lib/db-init";

export async function POST(req: Request) {
  try {
    await ensureDbTables();

    const ip = getClientIp(req);

    // 1. Anti-Bot Rate Limiting (max 5 signups per IP per 5 minutes)
    const rateCheck = checkRateLimit(`signup_${ip}`, 5, 300);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many registration attempts. Please try again in ${rateCheck.retryAfter}s.` },
        { status: 429 }
      );
    }

    const body = await req.json();

    // 2. Invisible Honeypot Trap Check (Blocks automated spam bots)
    if (isBotHoneypotTriggered(body)) {
      return NextResponse.json({ error: "Invalid registration submission" }, { status: 400 });
    }

    const { username, email, password, avatar, activeRole, intent, socialGroup, mood, bio } = body;

    // 3. Input Sanitization
    const cleanUsername = sanitizeText(username, 30);
    const cleanBio = sanitizeText(bio, 250);
    const cleanEmail = email ? sanitizeText(email, 100) : null;

    if (!cleanUsername || cleanUsername.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 valid alphanumeric characters" },
        { status: 400 }
      );
    }

    // Check if username exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanUsername },
          ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this username or email already exists" },
        { status: 400 }
      );
    }

    const passwordHash = password ? await hashPassword(password) : null;

    const user = await prisma.user.create({
      data: {
        username: cleanUsername,
        email: cleanEmail,
        passwordHash,
        avatar: avatar || "🌙",
        bio: cleanBio || "Here to have meaningful conversations.",
        activeRole: activeRole || "PROBLEM_FACER",
        preferredIntent: intent || "PEACE",
        preferredSocialGroup: socialGroup || "OPEN",
        mood: mood || "Need to vent",
        trustScore: 5.0,
        karmaPoints: 100,
      },
    });

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
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create account" },
      { status: 500 }
    );
  }
}
