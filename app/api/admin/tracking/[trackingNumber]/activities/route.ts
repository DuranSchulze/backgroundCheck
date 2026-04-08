import { NextResponse } from "next/server";
import {
  AdminTrackingError,
  appendProgressActivity,
} from "@/lib/tracking/admin";

type RouteContext = {
  params: Promise<{
    trackingNumber: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { trackingNumber } = await context.params;

  try {
    const payload = (await request.json()) as unknown;
    const detail = await appendProgressActivity(trackingNumber, payload);
    return NextResponse.json({ detail });
  } catch (error) {
    const status = error instanceof AdminTrackingError ? 400 : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Unable to append tracking activity.";

    return NextResponse.json({ error: message }, { status });
  }
}
