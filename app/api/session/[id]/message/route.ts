import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { generateCompanionReply, COMPANION_BOT_ID } from "@/lib/ai-companion";
import { SAFETY_WORDS_FILTER } from "@/lib/data";
import { checkRateLimit, sanitizeText, containsMaliciousLinkOrCode } from "@/lib/security";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Anti-Flood Rate Limit (max 15 messages per 10 seconds per user)
    const rateCheck = checkRateLimit(`msg_${user.id}`, 15, 10);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `You are sending messages too quickly. Please wait a moment.` },
        { status: 429 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { content, type = "TEXT" } = body;

    // 2. Input Sanitization & Anti-XSS
    const cleanContent = sanitizeText(content, 1500);

    if (!cleanContent || !cleanContent.trim()) {
      return NextResponse.json({ error: "Message content cannot be empty" }, { status: 400 });
    }

    // 3. Virus & Malicious Executable Link Blocker
    if (containsMaliciousLinkOrCode(cleanContent)) {
      return NextResponse.json(
        { error: "Security Alert: Executable links, scripts, or suspicious payloads are strictly blocked." },
        { status: 400 }
      );
    }

    const session = await prisma.conversationSession.findUnique({
      where: { id },
      include: {
        messages: {
          select: { id: true },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.userOneId !== user.id && session.userTwoId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (session.status !== "ACTIVE") {
      return NextResponse.json({ error: "This conversation has already ended" }, { status: 400 });
    }

    // 4. Safety word filter check
    const lower = cleanContent.toLowerCase();
    const containsSevereAbuse = SAFETY_WORDS_FILTER.some((w) => lower.includes(w));
    if (containsSevereAbuse) {
      return NextResponse.json(
        { error: "Message blocked by safety filter. Please maintain a respectful environment." },
        { status: 400 }
      );
    }

    // Create user message
    const message = await prisma.message.create({
      data: {
        sessionId: session.id,
        userId: user.id,
        content: cleanContent,
        type,
      },
    });

    // If partner is AI Companion, trigger companion reply
    if (session.isCompanion && (session.userOneId === COMPANION_BOT_ID || session.userTwoId === COMPANION_BOT_ID)) {
      const historyCount = session.messages.length + 1;
      const companionReplyText = generateCompanionReply(
        cleanContent,
        session.intent,
        session.mood,
        historyCount
      );

      setTimeout(async () => {
        try {
          await prisma.message.create({
            data: {
              sessionId: session.id,
              userId: COMPANION_BOT_ID,
              content: companionReplyText,
              type: "TEXT",
            },
          });
        } catch (e) {
          console.error("Companion reply error:", e);
        }
      }, 1000);
    }

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 500 }
    );
  }
}
