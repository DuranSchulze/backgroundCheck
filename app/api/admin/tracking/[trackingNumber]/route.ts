import { NextResponse } from "next/server";
import {
  AdminTrackingError,
  getAdminTrackingDetail,
  upsertOverallProgress,
} from "@/lib/tracking/admin";

type RouteContext = {
  params: Promise<{
    trackingNumber: string;
  }>;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to process admin tracking request.";
}

export async function GET(_: Request, context: RouteContext) {
  const { trackingNumber } = await context.params;

  try {
    const detail = await getAdminTrackingDetail(trackingNumber);
    return NextResponse.json({ detail });
  } catch (error) {
    const status = error instanceof AdminTrackingError ? 400 : 500;
    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const { trackingNumber } = await context.params;

  try {
    const payload = (await request.json()) as unknown;
    const detail = await upsertOverallProgress(trackingNumber, payload);
    return NextResponse.json({ detail });
  } catch (error) {
    const status = error instanceof AdminTrackingError ? 400 : 500;
    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}
