import { getSessionCookie } from "./auth";
import { prisma } from "./prisma";

export async function getCurrentUser() {
  const session = await getSessionCookie();
  if (!session || !session.userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      interests: {
        include: { interest: true },
      },
    },
  });

  if (!user || user.isBanned) {
    return null;
  }

  return user;
}
