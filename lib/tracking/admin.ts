import { ProgressStatus } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { findOrderRowByTrackingNumber } from "@/lib/tracking/google-sheets";
import { buildTrackingRecord, getCheckedColumnDetails } from "@/lib/tracking/format";
import {
  ensureOrderProgressForSnapshot,
  getOrderProgressByTrackingNumber,
} from "@/lib/tracking/progress";
import type {
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

  let checks = progressData.checks;

  if (checks.length === 0) {
    const checkDetails = getCheckedColumnDetails(order.rawFields);
    if (checkDetails.length > 0) {
      const orderProgressId = await getProgressIdByTrackingNumber(order.trackingNumber);
      await Promise.all(
        checkDetails.map((check, index) =>
          prisma.checkTypeProgress.upsert({
            where: {
              orderProgressId_checkName: { orderProgressId, checkName: check.label },
            },
            create: { orderProgressId, checkName: check.label, sortOrder: index },
            update: {},
          }),
        ),
      );
      const refreshed = await getOrderProgressByTrackingNumber(order.trackingNumber);
      checks = refreshed.checks;
    }
  }

  return {
    order,
    progress: progressData.progress,
    checks,
    activities: progressData.activities,
    trackerRecord: buildTrackingRecord({
      order,
      progress: progressData.progress,
      checks,
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

export async function initializeChecksFromSheet(trackingNumber: string) {
  const order = await getRequiredOrder(trackingNumber);
  await ensureOrderProgressForSnapshot(order);
  const orderProgressId = await getProgressIdByTrackingNumber(order.trackingNumber);

  const checkDetails = getCheckedColumnDetails(order.rawFields);

  if (checkDetails.length === 0) {
    throw new AdminTrackingError(
      "No checkbox columns with selected values found in the Google Sheet row.",
    );
  }

  await Promise.all(
    checkDetails.map((check, index) =>
      prisma.checkTypeProgress.upsert({
        where: {
          orderProgressId_checkName: {
            orderProgressId,
            checkName: check.label,
          },
        },
        create: {
          orderProgressId,
          checkName: check.label,
          sortOrder: index,
        },
        update: {},
      }),
    ),
  );

  return getAdminTrackingDetail(order.trackingNumber);
}

export async function updateServiceCheck(
  trackingNumber: string,
  checkId: string,
  payload: { status?: string; notes?: string },
) {
  const order = await getRequiredOrder(trackingNumber);
  const orderProgressId = await getProgressIdByTrackingNumber(order.trackingNumber);

  const existing = await prisma.checkTypeProgress.findFirst({
    where: { id: checkId, orderProgressId },
  });

  if (!existing) {
    throw new AdminTrackingError("Service check record not found.");
  }

  await prisma.checkTypeProgress.update({
    where: { id: checkId },
    data: {
      status:
        payload.status !== undefined ? parseProgressStatus(payload.status) : undefined,
      notes: payload.notes !== undefined ? payload.notes : undefined,
    },
  });

  return getAdminTrackingDetail(order.trackingNumber);
}

export async function reorderServiceChecks(
  trackingNumber: string,
  orderedIds: string[],
) {
  const order = await getRequiredOrder(trackingNumber);
  const orderProgressId = await getProgressIdByTrackingNumber(order.trackingNumber);

  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.checkTypeProgress.updateMany({
        where: { id, orderProgressId },
        data: { sortOrder: index },
      }),
    ),
  );

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

export async function getServiceCheckById(
  trackingNumber: string,
  checkId: string,
) {
  const order = await getRequiredOrder(trackingNumber);
  const orderProgressId = await getProgressIdByTrackingNumber(order.trackingNumber);

  const check = await prisma.checkTypeProgress.findFirst({
    where: { id: checkId, orderProgressId },
    include: {
      tasks: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!check) {
    throw new AdminTrackingError("Service check not found.");
  }

  return {
    id: check.id,
    checkName: check.checkName,
    status: check.status as import("@/lib/tracking/types").CheckProgressStatus,
    notes: check.notes,
    timelineLabel: check.timelineLabel,
    sortOrder: check.sortOrder,
    createdAt: check.createdAt.toISOString(),
    updatedAt: check.updatedAt.toISOString(),
    trackingNumber: order.trackingNumber,
    tasks: check.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status as import("@/lib/tracking/types").CheckProgressStatus,
      notes: t.notes,
      sortOrder: t.sortOrder,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  };
}

export async function createCheckTask(
  trackingNumber: string,
  checkId: string,
  title: string,
) {
  const order = await getRequiredOrder(trackingNumber);
  const orderProgressId = await getProgressIdByTrackingNumber(order.trackingNumber);

  const check = await prisma.checkTypeProgress.findFirst({
    where: { id: checkId, orderProgressId },
    include: { tasks: { select: { id: true } } },
  });

  if (!check) throw new AdminTrackingError("Service check not found.");

  const trimmed = title.trim();
  if (!trimmed) throw new AdminTrackingError("Task title cannot be empty.");

  await prisma.checkTask.create({
    data: {
      checkTypeProgressId: checkId,
      title: trimmed,
      sortOrder: check.tasks.length,
    },
  });
}

export async function updateCheckTask(
  trackingNumber: string,
  checkId: string,
  taskId: string,
  payload: { status?: string; notes?: string; title?: string },
) {
  const order = await getRequiredOrder(trackingNumber);
  const orderProgressId = await getProgressIdByTrackingNumber(order.trackingNumber);

  const check = await prisma.checkTypeProgress.findFirst({
    where: { id: checkId, orderProgressId },
  });
  if (!check) throw new AdminTrackingError("Service check not found.");

  const task = await prisma.checkTask.findFirst({
    where: { id: taskId, checkTypeProgressId: checkId },
  });
  if (!task) throw new AdminTrackingError("Task not found.");

  await prisma.checkTask.update({
    where: { id: taskId },
    data: {
      status:
        payload.status !== undefined ? parseProgressStatus(payload.status) : undefined,
      notes: payload.notes !== undefined ? payload.notes : undefined,
      title: payload.title?.trim() ? payload.title.trim() : undefined,
    },
  });
}

export async function deleteCheckTask(
  trackingNumber: string,
  checkId: string,
  taskId: string,
) {
  const order = await getRequiredOrder(trackingNumber);
  const orderProgressId = await getProgressIdByTrackingNumber(order.trackingNumber);

  const check = await prisma.checkTypeProgress.findFirst({
    where: { id: checkId, orderProgressId },
  });
  if (!check) throw new AdminTrackingError("Service check not found.");

  await prisma.checkTask.deleteMany({
    where: { id: taskId, checkTypeProgressId: checkId },
  });
}

export async function reorderCheckTasks(
  trackingNumber: string,
  checkId: string,
  orderedIds: string[],
) {
  const order = await getRequiredOrder(trackingNumber);
  const orderProgressId = await getProgressIdByTrackingNumber(order.trackingNumber);

  const check = await prisma.checkTypeProgress.findFirst({
    where: { id: checkId, orderProgressId },
  });
  if (!check) throw new AdminTrackingError("Service check not found.");

  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.checkTask.updateMany({
        where: { id, checkTypeProgressId: checkId },
        data: { sortOrder: index },
      }),
    ),
  );
}

export async function getProgressOnly(trackingNumber: string) {
  return getOrderProgressByTrackingNumber(trackingNumber);
}
