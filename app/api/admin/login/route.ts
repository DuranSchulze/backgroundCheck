import { NextResponse } from "next/server";
import {
  createAdminSession,
  validateAdminCredentials,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      username?: string;
      password?: string;
    };

    const username = payload.username?.trim() ?? "";
    const password = payload.password?.trim() ?? "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 },
      );
    }

    if (!validateAdminCredentials(username, password)) {
      return NextResponse.json(
        { error: "Invalid admin credentials." },
        { status: 401 },
      );
    }

    await createAdminSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to complete admin login.",
      },
      { status: 500 },
    );
  }
}
