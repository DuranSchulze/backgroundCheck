import { mockTrackingRecords } from "@/lib/tracking/mock-data";
import { SheetsApiError, SheetsConfigError } from "@/lib/sheets/intake";
import {
  findOrderByTrackingNumber,
  listOrders,
} from "@/lib/sheets/intake";
import {
  getOrderProgress,
  getCheckProgress,
  getActivities,
} from "@/lib/sheets/operations";
import { buildTrackingRecord, buildTrackingSample } from "@/lib/tracking/format";
import { normalizeReferenceNumber } from "@/lib/tracking/normalize";
import type { TrackingRecord, TrackingSample } from "@/lib/tracking/types";

type DataSource = "mock" | "google-sheets";

function getDataSource(): DataSource {
  if (process.env.TRACKING_DATA_SOURCE === "mock") return "mock";

  if (
    process.env.TRACKING_DATA_SOURCE === "google-sheets" ||
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim()
  ) {
    return "google-sheets";
  }

  return "mock";
}

function mapToSample(record: TrackingRecord): TrackingSample {
  return {
    referenceNumber: record.referenceNumber,
    status: record.status,
    title: record.title,
    summary: record.summary,
  };
}

function findMockRecord(referenceNumber: string) {
  const normalized = normalizeReferenceNumber(referenceNumber);
  return (
    mockTrackingRecords.find(
      (r) => normalizeReferenceNumber(r.referenceNumber) === normalized,
    ) ?? null
  );
}

function listMockSamples(): TrackingSample[] {
  return mockTrackingRecords.map(mapToSample);
}

async function findGoogleSheetsRecord(
  referenceNumber: string,
): Promise<TrackingRecord | null> {
  const order = await findOrderByTrackingNumber(referenceNumber);
  if (!order) return null;

  const [progress, checks, activities] = await Promise.all([
    getOrderProgress(order.trackingNumber),
    getCheckProgress(order.trackingNumber),
    getActivities(order.trackingNumber),
  ]);

  return buildTrackingRecord({ order, progress, checks, activities });
}

async function listGoogleSheetsSamples(): Promise<TrackingSample[]> {
  const orders = await listOrders();

  const samples = await Promise.all(
    orders.slice(0, 10).map(async (order) => {
      const progress = await getOrderProgress(order.trackingNumber);
      return buildTrackingSample({ order, progress });
    }),
  );

  return samples;
}

export async function findTrackingRecord(
  referenceNumber: string,
): Promise<TrackingRecord | null> {
  return getDataSource() === "google-sheets"
    ? findGoogleSheetsRecord(referenceNumber)
    : findMockRecord(referenceNumber);
}

export async function listTrackingSamples(): Promise<TrackingSample[]> {
  return getDataSource() === "google-sheets"
    ? listGoogleSheetsSamples()
    : listMockSamples();
}

export function isTrackingConfigError(
  error: unknown,
): error is SheetsConfigError | SheetsApiError {
  return error instanceof SheetsConfigError || error instanceof SheetsApiError;
}
