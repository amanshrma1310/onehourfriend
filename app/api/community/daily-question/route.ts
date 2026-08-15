import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { DAILY_QUESTIONS } from "@/lib/data";

export async function GET() {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    
    // Find or seed today's daily question
    let question = await prisma.dailyQuestion.findFirst({
      where: { date: todayStr },
      include: {
        answers: {
          orderBy: { createdAt: "desc" },
          take: 30,
        },
      },
    });

    if (!question) {
      const defaultQ = DAILY_QUESTIONS[0];
      question = await prisma.dailyQuestion.create({
        data: {
          date: todayStr,
          question: defaultQ.question,
          category: defaultQ.category,
        },
        include: {
          answers: true,
        },
      });
    }

    return NextResponse.json({ success: true, question });
  } catch (error: any) {
    console.error("Daily question get error:", error);
    return NextResponse.json({ error: "Failed to load daily question" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { questionId, answer, likeAnswerId } = body;

    // Handle like on answer
    if (likeAnswerId) {
      const updatedAnswer = await prisma.dailyAnswer.update({
        where: { id: likeAnswerId },
        data: { likesCount: { increment: 1 } },
      });
      return NextResponse.json({ success: true, answer: updatedAnswer });
    }

    if (!answer || answer.trim().length < 3) {
      return NextResponse.json({ error: "Answer must be at least 3 characters" }, { status: 400 });
    }

    const createdAnswer = await prisma.dailyAnswer.create({
      data: {
        questionId,
        userId: user.id,
        anonymousName: user.username || "Anonymous Soul",
        avatar: user.avatar || "✨",
        answer: answer.trim(),
      },
    });

    await prisma.dailyQuestion.update({
      where: { id: questionId },
      data: { totalAnswers: { increment: 1 } },
    });

    return NextResponse.json({ success: true, answer: createdAnswer });
  } catch (error: any) {
    console.error("Daily answer error:", error);
    return NextResponse.json({ error: "Failed to submit answer" }, { status: 500 });
  }
}
