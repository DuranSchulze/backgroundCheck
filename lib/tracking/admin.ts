import { ProgressStatus, TaskPriority } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getCheckCategoryLabel, buildTrackingRecord } from "@/lib/tracking/format";
import { findOrderRowByTrackingNumber } from "@/lib/tracking/google-sheets";
import {
  ensureOrderProgressForSnapshot,
  getOrderPublicStepTasks,
  getOrderProgressByTrackingNumber,
  getOrderWorkflowTasks,
  syncCheckProgressRollups,
} from "@/lib/tracking/progress";
import type {
  CheckProgressStatus,
  CheckTaskView,
  OrderProgressView,
  SheetOrderSnapshot,
  TaskPriority as TaskPriorityValue,
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

function parseTaskPriority(value: unknown) {
  if (typeof value !== "string" || !(value in TaskPriority)) {
    throw new AdminTrackingError(
      "Priority must be one of LOW, MEDIUM, HIGH, or URGENT.",
    );
  }

  return value as TaskPriorityValue;
}

function parseDueDate(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new AdminTrackingError("Due date must be an ISO string or empty.");
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new AdminTrackingError("Due date must be a valid date.");
  }

  return parsed;
}

function parsePublicStepNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AdminTrackingError("Step # must be a positive whole number.");
  }

  return parsed;
}

function parseFileUrl(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new AdminTrackingError("File link must be a URL or empty.");
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new AdminTrackingError(
        "File link must start with http:// or https://.",
      );
    }
  } catch (error) {
    if (error instanceof AdminTrackingError) {
      throw error;
    }

    throw new AdminTrackingError("File link must be a valid URL.");
  }

  return trimmed;
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

function getRequestedServices(order: SheetOrderSnapshot) {
  return order.selectedCheckCategories.map((checkType, index) => ({
    serviceKey: checkType,
    serviceLabel: getCheckCategoryLabel(checkType),
    sortOrder: index,
  }));
}

async function syncServicesFromOrder(order: SheetOrderSnapshot) {
  const orderProgressId = await getProgressIdByTrackingNumber(order.trackingNumber);
  const services = getRequestedServices(order);

  if (services.length === 0) {
    return;
  }

  await Promise.all(
    services.map((service) =>
      prisma.checkTypeProgress.upsert({
        where: {
          orderProgressId_serviceKey: {
            orderProgressId,
            serviceKey: service.serviceKey,
          },
        },
        create: {
          orderProgressId,
          serviceKey: service.serviceKey,
          serviceLabel: service.serviceLabel,
          sortOrder: service.sortOrder,
        },
        update: {
          serviceLabel: service.serviceLabel,
        },
      }),
    ),
  );
}

async function validateAssigneeId(assigneeId: string | null | undefined) {
  if (!assigneeId) {
    return null;
  }

  const assignee = await prisma.staffUser.findUnique({
    where: { id: assigneeId },
    select: { id: true, isActive: true },
  });

  if (!assignee || !assignee.isActive) {
    throw new AdminTrackingError("Assignee must be an active staff member.");
  }

  return assignee.id;
}

async function getCheckForOrder(trackingNumber: string, checkId: string) {
  const orderProgressId = await getProgressIdByTrackingNumber(trackingNumber);

  const check = await prisma.checkTypeProgress.findFirst({
    where: { id: checkId, orderProgressId },
  });

  if (!check) {
    throw new AdminTrackingError("Service check not found.");
  }

  return check;
}

async function validatePublicStepNumber(params: {
  trackingNumber: string;
  taskId?: string;
  publicStepNumber: number | null;
}) {
  if (params.publicStepNumber === null) {
    return null;
  }

  const conflictingTask = await prisma.checkTask.findFirst({
    where: {
      id: params.taskId ? { not: params.taskId } : undefined,
      publicStepNumber: params.publicStepNumber,
      checkTypeProgress: {
        orderProgress: {
          trackingNumber: params.trackingNumber,
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (conflictingTask) {
    throw new AdminTrackingError(
      `Step #${params.publicStepNumber} is already assigned to another task in this order.`,
    );
  }

  return params.publicStepNumber;
}

function mapTask(task: CheckTaskView) {
  return task;
}

export async function getAdminTrackingDetail(
  trackingNumber: string,
): Promise<OrderProgressView> {
  const order = await getRequiredOrder(trackingNumber);
  await ensureOrderProgressForSnapshot(order);
  await syncServicesFromOrder(order);

  const progressData = await getOrderProgressByTrackingNumber(order.trackingNumber);
  const tasks = await getOrderWorkflowTasks(order.trackingNumber);
  const publicStepTasks = await getOrderPublicStepTasks(order.trackingNumber);

  return {
    order,
    progress: progressData.progress,
    checks: progressData.checks,
    tasks: tasks.map(mapTask),
    activities: progressData.activities,
    trackerRecord: buildTrackingRecord({
      order,
      progress: progressData.progress,
      checks: progressData.checks,
      tasks: publicStepTasks,
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
  await syncServicesFromOrder(order);

  const checkCount = await prisma.checkTypeProgress.count({
    where: {
      orderProgress: {
        trackingNumber: order.trackingNumber,
      },
    },
  });

  await prisma.orderProgress.update({
    where: { trackingNumber: order.trackingNumber },
    data: {
      overallStatus:
        checkCount === 0 && body.overallStatus !== undefined
          ? parseProgressStatus(body.overallStatus)
          : undefined,
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
  await syncServicesFromOrder(order);
  return getAdminTrackingDetail(order.trackingNumber);
}

export async function updateServiceCheck(
  trackingNumber: string,
  checkId: string,
  payload: {
    status?: string;
    notes?: string;
    timelineLabel?: string;
    fileUrl?: string | null;
  },
) {
  const check = await getCheckForOrder(trackingNumber, checkId);
  const taskCount = await prisma.checkTask.count({
    where: { checkTypeProgressId: check.id },
  });

  await prisma.checkTypeProgress.update({
    where: { id: checkId },
    data: {
      status:
        taskCount === 0 && payload.status !== undefined
          ? parseProgressStatus(payload.status)
          : undefined,
      notes: payload.notes !== undefined ? payload.notes : undefined,
      timelineLabel:
        payload.timelineLabel !== undefined ? payload.timelineLabel : undefined,
      fileUrl:
        payload.fileUrl !== undefined ? parseFileUrl(payload.fileUrl) : undefined,
    },
  });

  return getAdminTrackingDetail(trackingNumber);
}

export async function reorderServiceChecks(
  trackingNumber: string,
  orderedIds: string[],
) {
  const orderProgressId = await getProgressIdByTrackingNumber(trackingNumber);

  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.checkTypeProgress.updateMany({
        where: { id, orderProgressId },
        data: { sortOrder: index },
      }),
    ),
  );

  return getAdminTrackingDetail(trackingNumber);
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
  await ensureOrderProgressForSnapshot(order);
  await syncServicesFromOrder(order);

  const check = await prisma.checkTypeProgress.findFirst({
    where: {
      id: checkId,
      orderProgress: {
        trackingNumber,
      },
    },
    include: {
      tasks: {
        include: {
          assignee: true,
          checkTypeProgress: {
            select: {
              id: true,
              serviceKey: true,
              serviceLabel: true,
            },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!check) {
    throw new AdminTrackingError("Service check not found.");
  }

  return {
    id: check.id,
    serviceKey: check.serviceKey,
    serviceLabel: check.serviceLabel,
    status: check.status as CheckProgressStatus,
    notes: check.notes,
    fileUrl: check.fileUrl,
    timelineLabel: check.timelineLabel,
    sortOrder: check.sortOrder,
    createdAt: check.createdAt.toISOString(),
    updatedAt: check.updatedAt.toISOString(),
    trackingNumber: order.trackingNumber,
    tasks: check.tasks.map((task) => ({
      id: task.id,
      checkId: task.checkTypeProgress.id,
      serviceKey: task.checkTypeProgress.serviceKey,
      serviceLabel: task.checkTypeProgress.serviceLabel,
      title: task.title,
      description: task.description,
      status: task.status as CheckProgressStatus,
      priority: task.priority as TaskPriorityValue,
      publicStepNumber: task.publicStepNumber,
      dueDate: task.dueDate?.toISOString() ?? null,
      notes: task.notes,
      fileUrl: task.fileUrl,
      sortOrder: task.sortOrder,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      assignee: task.assignee
        ? {
            id: task.assignee.id,
            name: task.assignee.name,
            email: task.assignee.email,
            isActive: task.assignee.isActive,
            createdAt: task.assignee.createdAt.toISOString(),
            updatedAt: task.assignee.updatedAt.toISOString(),
          }
        : null,
    })),
  };
}

export async function createCheckTask(
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
  const check = await getCheckForOrder(trackingNumber, checkId);
  const taskCount = await prisma.checkTask.count({
    where: { checkTypeProgressId: check.id },
  });
  const title = payload.title.trim();

  if (!title) {
    throw new AdminTrackingError("Task title cannot be empty.");
  }

  const assigneeId = await validateAssigneeId(payload.assigneeId);
  const publicStepNumber = await validatePublicStepNumber({
    trackingNumber,
    publicStepNumber: parsePublicStepNumber(payload.publicStepNumber),
  });

  await prisma.checkTask.create({
    data: {
      checkTypeProgressId: check.id,
      title,
      description: payload.description?.trim() || null,
      status:
        payload.status !== undefined ? parseProgressStatus(payload.status) : "QUEUED",
      priority:
        payload.priority !== undefined ? parseTaskPriority(payload.priority) : "MEDIUM",
      publicStepNumber,
      dueDate: parseDueDate(payload.dueDate),
      notes: payload.notes?.trim() || null,
      fileUrl: parseFileUrl(payload.fileUrl),
      assigneeId,
      sortOrder: taskCount,
    },
  });

  await syncCheckProgressRollups(check.id);
}

export async function updateCheckTask(
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
  const check = await getCheckForOrder(trackingNumber, checkId);

  const task = await prisma.checkTask.findFirst({
    where: { id: taskId, checkTypeProgressId: check.id },
  });

  if (!task) {
    throw new AdminTrackingError("Task not found.");
  }

  const assigneeId =
    payload.assigneeId !== undefined
      ? await validateAssigneeId(payload.assigneeId)
      : undefined;
  const publicStepNumber =
    payload.publicStepNumber !== undefined
      ? await validatePublicStepNumber({
          trackingNumber,
          taskId,
          publicStepNumber: parsePublicStepNumber(payload.publicStepNumber),
        })
      : undefined;

  await prisma.checkTask.update({
    where: { id: taskId },
    data: {
      status:
        payload.status !== undefined ? parseProgressStatus(payload.status) : undefined,
      notes: payload.notes !== undefined ? payload.notes || null : undefined,
      title: payload.title?.trim() ? payload.title.trim() : undefined,
      description:
        payload.description !== undefined
          ? payload.description.trim() || null
          : undefined,
      priority:
        payload.priority !== undefined
          ? parseTaskPriority(payload.priority)
          : undefined,
      publicStepNumber,
      dueDate:
        payload.dueDate !== undefined ? parseDueDate(payload.dueDate) : undefined,
      fileUrl:
        payload.fileUrl !== undefined ? parseFileUrl(payload.fileUrl) : undefined,
      assigneeId,
    },
  });

  await syncCheckProgressRollups(check.id);
}

export async function deleteCheckTask(
  trackingNumber: string,
  checkId: string,
  taskId: string,
) {
  const check = await getCheckForOrder(trackingNumber, checkId);

  await prisma.checkTask.deleteMany({
    where: { id: taskId, checkTypeProgressId: check.id },
  });

  await syncCheckProgressRollups(check.id);
}

export async function reorderCheckTasks(
  trackingNumber: string,
  checkId: string,
  orderedIds: string[],
) {
  const check = await getCheckForOrder(trackingNumber, checkId);

  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.checkTask.updateMany({
        where: { id, checkTypeProgressId: check.id },
        data: { sortOrder: index },
      }),
    ),
  );

  await syncCheckProgressRollups(check.id);
}

export async function getProgressOnly(trackingNumber: string) {
  return getOrderProgressByTrackingNumber(trackingNumber);
}
