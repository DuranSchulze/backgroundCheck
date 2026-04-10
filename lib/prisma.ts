import { PrismaClient } from "@/lib/generated/prisma/client";

const PRISMA_CLIENT_BUILD_ID = "2026-04-10-public-task-step-tracking";

declare global {
  var prisma: PrismaClient | undefined;
  var prismaBuildId: string | undefined;
}

function createPrismaClient() {
  const accelerateUrl = process.env.DATABASE_URL;

  if (!accelerateUrl) {
    throw new Error("DATABASE_URL is required to initialize Prisma.");
  }

  return new PrismaClient({
    accelerateUrl,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export function getPrismaClient() {
  if (!globalThis.prisma || globalThis.prismaBuildId !== PRISMA_CLIENT_BUILD_ID) {
    globalThis.prisma?.$disconnect?.().catch(() => undefined);
    globalThis.prisma = createPrismaClient();
    globalThis.prismaBuildId = PRISMA_CLIENT_BUILD_ID;
  }

  return globalThis.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    return Reflect.get(getPrismaClient(), property, receiver);
  },
});
