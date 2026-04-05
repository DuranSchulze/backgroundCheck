import { NextResponse } from "next/server";
import {
  findTrackingRecord,
  isTrackingConfigError,
} from "@/lib/tracking/repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const referenceNumber = searchParams.get("referenceNumber")?.trim();

  if (!referenceNumber) {
    return NextResponse.json(
      { error: "A referenceNumber query parameter is required." },
      { status: 400 },
    );
  }

  try {
    const record = await findTrackingRecord(referenceNumber);

    if (!record) {
      return NextResponse.json(
        { error: "Reference number not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ record });
  } catch (error) {
    const message = isTrackingConfigError(error)
      ? error.message
      : "Unable to fetch tracking details.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
