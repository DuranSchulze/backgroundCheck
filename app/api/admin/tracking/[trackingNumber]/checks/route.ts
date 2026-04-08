import { NextResponse } from "next/server";
import {
  AdminTrackingError,
  upsertCheckProgress,
} from "@/lib/tracking/admin";

type RouteContext = {
  params: Promise<{
    trackingNumber: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { trackingNumber } = await context.params;

  try {
    const payload = (await request.json()) as unknown;
    const detail = await upsertCheckProgress(trackingNumber, payload);
    return NextResponse.json({ detail });
  } catch (error) {
    const status = error instanceof AdminTrackingError ? 400 : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update check progress.";

    return NextResponse.json({ error: message }, { status });
  }
}
