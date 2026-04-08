"use server";

import { revalidatePath } from "next/cache";
import {
  initializeChecksFromSheet,
  updateServiceCheck,
  reorderServiceChecks,
  AdminTrackingError,
} from "@/lib/tracking/admin";

function orderPath(trackingNumber: string) {
  return `/admin/orders/${encodeURIComponent(trackingNumber)}`;
}

export async function actionInitializeChecks(trackingNumber: string) {
  try {
    await initializeChecksFromSheet(trackingNumber);
  } catch (err) {
    if (err instanceof AdminTrackingError) {
      return { error: err.message };
    }
    throw err;
  }
  revalidatePath(orderPath(trackingNumber));
}

export async function actionUpdateServiceCheck(
  trackingNumber: string,
  checkId: string,
  payload: { status?: string; notes?: string },
) {
  try {
    await updateServiceCheck(trackingNumber, checkId, payload);
  } catch (err) {
    if (err instanceof AdminTrackingError) {
      return { error: err.message };
    }
    throw err;
  }
  revalidatePath(orderPath(trackingNumber));
}

export async function actionReorderServiceChecks(
  trackingNumber: string,
  orderedIds: string[],
) {
  try {
    await reorderServiceChecks(trackingNumber, orderedIds);
  } catch (err) {
    if (err instanceof AdminTrackingError) {
      return { error: err.message };
    }
    throw err;
  }
  revalidatePath(orderPath(trackingNumber));
}
