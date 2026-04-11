"use server";

import { revalidatePath } from "next/cache";
import {
  initializeChecksFromSheet,
  updateServiceCheck,
  reorderServiceChecks,
  createCheckTask,
  updateCheckTask,
  deleteCheckTask,
  reorderCheckTasks,
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
  payload: {
    status?: string;
    notes?: string;
    timelineLabel?: string;
    fileUrl?: string | null;
  },
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

function checkPath(trackingNumber: string, checkId: string) {
  return `/admin/orders/${encodeURIComponent(trackingNumber)}/checks/${checkId}`;
}

export async function actionCreateCheckTask(
  trackingNumber: string,
  checkId: string,
  payload: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string | null;
    notes?: string;
    fileUrl?: string | null;
    assigneeId?: string | null;
    publicStepNumber?: number | string | null;
  },
) {
  try {
    await createCheckTask(trackingNumber, checkId, payload);
  } catch (err) {
    if (err instanceof AdminTrackingError) return { error: err.message };
    throw err;
  }
  revalidatePath(orderPath(trackingNumber));
  revalidatePath(checkPath(trackingNumber, checkId));
}

export async function actionUpdateCheckTask(
  trackingNumber: string,
  checkId: string,
  taskId: string,
  payload: {
    status?: string;
    notes?: string;
    title?: string;
    description?: string;
    priority?: string;
    dueDate?: string | null;
    fileUrl?: string | null;
    assigneeId?: string | null;
    publicStepNumber?: number | string | null;
  },
) {
  try {
    await updateCheckTask(trackingNumber, checkId, taskId, payload);
  } catch (err) {
    if (err instanceof AdminTrackingError) return { error: err.message };
    throw err;
  }
  revalidatePath(orderPath(trackingNumber));
  revalidatePath(checkPath(trackingNumber, checkId));
}

export async function actionDeleteCheckTask(
  trackingNumber: string,
  checkId: string,
  taskId: string,
) {
  try {
    await deleteCheckTask(trackingNumber, checkId, taskId);
  } catch (err) {
    if (err instanceof AdminTrackingError) return { error: err.message };
    throw err;
  }
  revalidatePath(orderPath(trackingNumber));
  revalidatePath(checkPath(trackingNumber, checkId));
}

export async function actionReorderCheckTasks(
  trackingNumber: string,
  checkId: string,
  orderedIds: string[],
) {
  try {
    await reorderCheckTasks(trackingNumber, checkId, orderedIds);
  } catch (err) {
    if (err instanceof AdminTrackingError) return { error: err.message };
    throw err;
  }
  revalidatePath(orderPath(trackingNumber));
  revalidatePath(checkPath(trackingNumber, checkId));
}
