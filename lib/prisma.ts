import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getSafeDatabaseUrl(): string {
  let url =
    process.env.DATABASE_URL ||
    "mysql://u297792138_amandeepsharma:Ishu%401310@127.0.0.1:3306/u297792138_onehourfriend";

  // Fix Linux IPv6 DNS hang on Hostinger: replace localhost with 127.0.0.1
  if (url.includes("@localhost:")) {
    url = url.replace("@localhost:", "@127.0.0.1:");
  } else if (url.includes("@localhost/")) {
    url = url.replace("@localhost/", "@127.0.0.1/");
  }

  return url;
}

function createPrismaClient() {
  const url = getSafeDatabaseUrl();

  const adapter = new PrismaMariaDb(url, {
    useTextProtocol: true,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
