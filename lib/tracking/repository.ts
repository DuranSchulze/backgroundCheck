import { SheetsApiError, SheetsConfigError } from "@/lib/sheets/intake";
import { findOrderByTrackingNumber } from "@/lib/sheets/intake";
import {
  getActivities,
  getCheckProgress,
  getOrderDriveFolder,
  getOrderProgress,
} from "@/lib/sheets/operations";
import { buildTrackingRecord } from "@/lib/tracking/format";
import type { TrackingRecord } from "@/lib/tracking/types";

export async function findTrackingRecord(
  referenceNumber: string,
): Promise<TrackingRecord | null> {
  const order = await findOrderByTrackingNumber(referenceNumber);
  if (!order) return null;

  const [progress, checks, activities] = await Promise.all([
    getOrderProgress(order.trackingNumber).catch(() => null),
    getCheckProgress(order.trackingNumber).catch(() => []),
    getActivities(order.trackingNumber).catch(() => []),
  ]);

  const drive = await getOrderDriveFolder(
    order.trackingNumber,
    order.subjectName || order.submitterName || null,
  ).catch(() => ({
    folder: null,
    folderUrl: null,
    files: [],
    source: "none" as const,
  }));

  return buildTrackingRecord({
    order,
    progress,
    checks,
    activities,
    files: drive.files,
    driveFolderUrl: drive.folderUrl,
  });
}

export function isTrackingConfigError(
  error: unknown,
): error is SheetsConfigError | SheetsApiError {
  return error instanceof SheetsConfigError || error instanceof SheetsApiError;
}
