import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, sanitizeText, containsMaliciousLinkOrCode } from "@/lib/security";

export async function GET() {
  try {
    const posts = await prisma.ventPost.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return NextResponse.json({ success: true, posts });
  } catch (error: any) {
    console.error("Vent get error:", error);
    return NextResponse.json({ error: "Failed to load vent wall" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Anti-Spam Rate Limit (max 3 vent posts per 2 minutes per user)
    const rateCheck = checkRateLimit(`vent_${user.id}`, 3, 120);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `You're posting too frequently. Please wait ${rateCheck.retryAfter}s before posting again.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { content, category = "Peace & Healing", mood = "Need to vent", hugPostId } = body;

    // Handle virtual hug action
    if (hugPostId) {
      const post = await prisma.ventPost.update({
        where: { id: hugPostId },
        data: { hugsCount: { increment: 1 } },
      });
      return NextResponse.json({ success: true, post });
    }

    // 2. Input Sanitization
    const cleanContent = sanitizeText(content, 1000);

    if (!cleanContent || cleanContent.length < 5) {
      return NextResponse.json(
        { error: "Vent message must be at least 5 characters long" },
        { status: 400 }
      );
    }

    // 3. Virus & Malicious Code Check
    if (containsMaliciousLinkOrCode(cleanContent)) {
      return NextResponse.json(
        { error: "Security Alert: Suspicious links or code are not permitted." },
        { status: 400 }
      );
    }

    const post = await prisma.ventPost.create({
      data: {
        userId: user.id,
        anonymousName: user.username || "Anonymous Friend",
        avatar: user.avatar || "🌙",
        content: cleanContent,
        category: sanitizeText(category, 50),
        mood: sanitizeText(mood, 50),
        hugsCount: 0,
      },
    });

    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    console.error("Vent post error:", error);
    return NextResponse.json({ error: "Failed to post to vent wall" }, { status: 500 });
  }
}
