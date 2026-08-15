import { prisma } from "./prisma";

export const COMPANION_BOT_ID = "ai-companion-system-user";

export async function ensureCompanionUserExists() {
  const existing = await prisma.user.findUnique({
    where: { id: COMPANION_BOT_ID },
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        id: COMPANION_BOT_ID,
        username: "Aura_Companion",
        avatar: "✨",
        bio: "An empathetic, thoughtful listener here for you 24/7 with zero judgment.",
        activeRole: "GUIDER",
        preferredIntent: "PEACE",
        mood: "Always Here to Listen",
        trustScore: 5.0,
        karmaPoints: 999,
        isAnonymous: true,
      },
    });
  }
}

export function generateCompanionReply(
  userMessage: string,
  sessionIntent: string,
  mood: string,
  historyLength: number
): string {
  const clean = userMessage.toLowerCase();

  if (historyLength <= 2) {
    if (sessionIntent === "PEACE") {
      return "I'm right here with you. Thank you for sharing that with me. Take a deep breath — you're in a safe, non-judgmental space. What has been making this feel the heaviest for you today?";
    }
    if (sessionIntent === "GUIDANCE") {
      return "I hear you, and it takes real clarity to pinpoint this challenge. Let's break it down step-by-step. What is the main outcome you'd ideally like to achieve here?";
    }
    return "Hey! It's so nice to meet you here. I love having spontaneous, wholesome conversations. What's something interesting that happened to you this week, or something you've been pondering?";
  }

  // Keywords detection
  if (clean.includes("stress") || clean.includes("anxious") || clean.includes("overthink") || clean.includes("pressure")) {
    return "That level of pressure can truly be exhausting when you carry it in silence. Remember that you don't have to figure out everything in a single day. When you look at this situation, what is one small thing within your control right now?";
  }

  if (clean.includes("breakup") || clean.includes("heart") || clean.includes("ex") || clean.includes("lonely") || clean.includes("alone")) {
    return "Heartache and loneliness can feel deeply overwhelming, but your feelings are completely valid. Be gentle with yourself right now. How are you taking care of yourself today?";
  }

  if (clean.includes("job") || clean.includes("career") || clean.includes("code") || clean.includes("college") || clean.includes("exam") || clean.includes("interview")) {
    return "That's a very common crossroad, and so many people navigate that exact anxiety. What do you feel is currently holding you back from making your next confident move?";
  }

  if (clean.includes("thank") || clean.includes("appreciate") || clean.includes("good")) {
    return "You're so welcome! Having this 60-minute space with you is truly special. What other thoughts are on your mind?";
  }

  const genericWarmReplies = [
    "That is such an insightful way to look at it. Tell me more about why you feel that way.",
    "I'm listening closely. How did that experience impact you emotionally?",
    "That makes total sense. If you could change one aspect of that situation right now, what would it be?",
    "It's really refreshing talking to you about this. What do you think your next step should be?",
    "Thank you for opening up like that. You seem like someone who reflects deeply on things.",
  ];

  return genericWarmReplies[Math.floor(Math.random() * genericWarmReplies.length)];
}
