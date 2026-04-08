import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const ADMIN_SESSION_COOKIE = "filepino_admin_session";

function getAdminCredentials() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();

  if (!username || !password) {
    throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD must be configured.");
  }

  return { username, password };
}

function createSessionToken(username: string, password: string) {
  return createHash("sha256")
    .update(`${username}:${password}`)
    .digest("hex");
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!session) {
    return false;
  }

  const { username, password } = getAdminCredentials();
  return safeCompare(session, createSessionToken(username, password));
}

export async function createAdminSession() {
  const cookieStore = await cookies();
  const { username, password } = getAdminCredentials();

  cookieStore.set(ADMIN_SESSION_COOKIE, createSessionToken(username, password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export function validateAdminCredentials(username: string, password: string) {
  const configured = getAdminCredentials();

  return (
    safeCompare(username, configured.username) &&
    safeCompare(password, configured.password)
  );
}
