import { NextResponse } from "next/server";
import {
  isTrackingConfigError,
  listTrackingSamples,
} from "@/lib/tracking/repository";

export async function GET() {
  try {
    const samples = await listTrackingSamples();
    return NextResponse.json({ samples });
  } catch (error) {
    const message = isTrackingConfigError(error)
      ? error.message
      : "Unable to fetch sample tracking references.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
