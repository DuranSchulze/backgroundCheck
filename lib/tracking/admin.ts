import { CheckCategory, ProgressStatus } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { findOrderRowByTrackingNumber } from "@/lib/tracking/google-sheets";
import { buildTrackingRecord } from "@/lib/tracking/format";
import {
  ensureOrderProgressForSnapshot,
  getCheckCategorySortOrder,
  getOrderProgressByTrackingNumber,
} from "@/lib/tracking/progress";
import type {
  CheckCategory as CheckCategoryValue,
  CheckProgressStatus,
  OrderProgressView,
} from "@/lib/tracking/types";

export class AdminTrackingError extends Error {}

function parseProgressStatus(value: unknown) {
  if (typeof value !== "string" || !(value in ProgressStatus)) {
    throw new AdminTrackingError(
      "Status must be one of QUEUED, IN_PROGRESS, ACTIVE_INVESTIGATION, COMPLETED, or ON_HOLD.",
    );
  }

  return value as CheckProgressStatus;
}

function parseCheckCategory(value: unknown) {
  if (typeof value !== "string" || !(value in CheckCategory)) {
    throw new AdminTrackingError(
      "checkType must be one of the configured background-check categories.",
    );
  }

  return value as CheckCategoryValue;
}

async function getRequiredOrder(trackingNumber: string) {
  const order = await findOrderRowByTrackingNumber(trackingNumber);

  if (!order) {
    throw new AdminTrackingError("Order tracking number was not found in Google Sheets.");
  }

  return order;
}

async function getProgressIdByTrackingNumber(trackingNumber: string) {
  const progress = await prisma.orderProgress.findUnique({
    where: { trackingNumber },
    select: { id: true },
  });

  if (!progress) {
    throw new AdminTrackingError(
      "Unable to initialize order progress for this tracking number.",
    );
  }

  return progress.id;
}

export async function getAdminTrackingDetail(
  trackingNumber: string,
): Promise<OrderProgressView> {
  const order = await getRequiredOrder(trackingNumber);
  const progressData = await ensureOrderProgressForSnapshot(order);

  return {
    order,
    progress: progressData.progress,
    checks: progressData.checks,
    activities: progressData.activities,
    trackerRecord: buildTrackingRecord({
      order,
      progress: progressData.progress,
      checks: progressData.checks,
      activities: progressData.activities,
    }),
  };
}

export async function upsertOverallProgress(
  trackingNumber: string,
  payload: unknown,
) {
  if (!payload || typeof payload !== "object") {
    throw new AdminTrackingError("Overall progress payload must be a JSON object.");
  }

  const body = payload as Record<string, unknown>;
  const order = await getRequiredOrder(trackingNumber);
  await ensureOrderProgressForSnapshot(order);

  await prisma.orderProgress.update({
    where: { trackingNumber: order.trackingNumber },
    data: {
      overallStatus:
        body.overallStatus === undefined
          ? undefined
          : parseProgressStatus(body.overallStatus),
      summary: typeof body.summary === "string" ? body.summary : undefined,
      etaLabel: typeof body.etaLabel === "string" ? body.etaLabel : undefined,
      adminNotes:
        typeof body.adminNotes === "string" ? body.adminNotes : undefined,
    },
  });

  return getAdminTrackingDetail(order.trackingNumber);
}

export async function upsertCheckProgress(
  trackingNumber: string,
  payload: unknown,
) {
  if (!payload || typeof payload !== "object") {
    throw new AdminTrackingError("Check progress payload must be a JSON object.");
  }

  const body = payload as Record<string, unknown>;
  const order = await getRequiredOrder(trackingNumber);
  const progressData = await ensureOrderProgressForSnapshot(order);

  if (!progressData.progress) {
    throw new AdminTrackingError("Unable to initialize order progress for this tracking number.");
  }

  const checkType = parseCheckCategory(body.checkType);
  const orderProgressId = await getProgressIdByTrackingNumber(order.trackingNumber);

  await prisma.checkTypeProgress.upsert({
    where: {
      orderProgressId_checkType: {
        orderProgressId,
        checkType,
      },
    },
    create: {
      orderProgressId,
      checkType,
      status:
        body.status === undefined ? "QUEUED" : parseProgressStatus(body.status),
      timelineLabel:
        typeof body.timelineLabel === "string" ? body.timelineLabel : null,
      notes: typeof body.notes === "string" ? body.notes : null,
      sortOrder:
        typeof body.sortOrder === "number"
          ? body.sortOrder
          : getCheckCategorySortOrder(checkType),
    },
    update: {
      status: body.status === undefined ? undefined : parseProgressStatus(body.status),
      timelineLabel:
        typeof body.timelineLabel === "string" ? body.timelineLabel : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      sortOrder:
        typeof body.sortOrder === "number" ? body.sortOrder : undefined,
    },
  });

  return getAdminTrackingDetail(order.trackingNumber);
}

export async function appendProgressActivity(
  trackingNumber: string,
  payload: unknown,
) {
  if (!payload || typeof payload !== "object") {
    throw new AdminTrackingError("Activity payload must be a JSON object.");
  }

  const body = payload as Record<string, unknown>;

  if (typeof body.message !== "string" || body.message.trim().length === 0) {
    throw new AdminTrackingError("Activity message is required.");
  }

  const order = await getRequiredOrder(trackingNumber);
  await ensureOrderProgressForSnapshot(order);
  const orderProgressId = await getProgressIdByTrackingNumber(order.trackingNumber);

  await prisma.progressActivity.create({
    data: {
      orderProgressId,
      message: body.message.trim(),
      highlight:
        typeof body.highlight === "string" && body.highlight.trim().length > 0
          ? body.highlight.trim()
          : null,
    },
  });

  return getAdminTrackingDetail(order.trackingNumber);
}

export async function getProgressOnly(trackingNumber: string) {
  return getOrderProgressByTrackingNumber(trackingNumber);
}
