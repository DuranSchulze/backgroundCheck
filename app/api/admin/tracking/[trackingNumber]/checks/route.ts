import { NextResponse } from "next/server";
import {
  AdminTrackingError,
  updateServiceCheck,
} from "@/lib/tracking/admin";

type RouteContext = {
  params: Promise<{
    trackingNumber: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { trackingNumber } = await context.params;

  try {
    const body = (await request.json()) as {
      checkId: string;
      status?: string;
      notes?: string;
      timelineLabel?: string;
      fileUrl?: string | null;
    };
    const detail = await updateServiceCheck(trackingNumber, body.checkId, {
      status: body.status,
      notes: body.notes,
      timelineLabel: body.timelineLabel,
      fileUrl: body.fileUrl,
    });
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
