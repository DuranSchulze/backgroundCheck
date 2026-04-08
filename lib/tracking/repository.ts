import { mockTrackingRecords } from "@/lib/tracking/mock-data";
import {
  GoogleSheetsConfigError,
  findOrderRowByTrackingNumber,
  listSheetOrderSnapshots,
} from "@/lib/tracking/google-sheets";
import { buildTrackingRecord, buildTrackingSample } from "@/lib/tracking/format";
import { normalizeReferenceNumber } from "@/lib/tracking/normalize";
import { getOrderProgressByTrackingNumber } from "@/lib/tracking/progress";
import type { TrackingRecord, TrackingSample } from "@/lib/tracking/types";

type DataSource = "mock" | "google-sheets";

class TrackingConfigError extends Error {}

function getDataSource(): DataSource {
  return process.env.TRACKING_DATA_SOURCE === "google-sheets"
    ? "google-sheets"
    : "mock";
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
  const normalizedReference = normalizeReferenceNumber(referenceNumber);

  return (
    mockTrackingRecords.find(
      (record) =>
        normalizeReferenceNumber(record.referenceNumber) === normalizedReference,
    ) ?? null
  );
}

function listMockSamples() {
  return mockTrackingRecords.map(mapToSample);
}

async function findGoogleSheetsRecord(referenceNumber: string) {
  const order = await findOrderRowByTrackingNumber(referenceNumber);

  if (!order) {
    return null;
  }

  const progressData = await getOrderProgressByTrackingNumber(order.trackingNumber);

  return buildTrackingRecord({
    order,
    progress: progressData.progress,
    checks: progressData.checks,
    activities: progressData.activities,
  });
}

async function listGoogleSheetsSamples() {
  const orders = await listSheetOrderSnapshots();

  const samples = await Promise.all(
    orders.slice(0, 10).map(async (order) => {
      const progressData = await getOrderProgressByTrackingNumber(order.trackingNumber);

      return buildTrackingSample({
        order,
        progress: progressData.progress,
      });
    }),
  );

  return samples;
}

export async function findTrackingRecord(referenceNumber: string) {
  return getDataSource() === "google-sheets"
    ? findGoogleSheetsRecord(referenceNumber)
    : findMockRecord(referenceNumber);
}

export async function listTrackingSamples() {
  return getDataSource() === "google-sheets"
    ? listGoogleSheetsSamples()
    : listMockSamples();
}

export function isTrackingConfigError(error: unknown): error is TrackingConfigError {
  return (
    error instanceof TrackingConfigError || error instanceof GoogleSheetsConfigError
  );
}

export { TrackingConfigError };
