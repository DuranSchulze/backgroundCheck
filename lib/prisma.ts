import { PrismaClient } from "@/lib/generated/prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
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
  if (!globalThis.prisma) {
    globalThis.prisma = createPrismaClient();
  }

  return globalThis.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    return Reflect.get(getPrismaClient(), property, receiver);
  },
});
