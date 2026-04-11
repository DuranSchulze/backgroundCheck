import { ProgressStatus, TaskPriority } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type {
  CheckProgressStatus,
  CheckProgressView,
  CheckTaskView,
  OrderProgressSummary,
  ProgressActivityView,
  SheetOrderSnapshot,
  StaffUserView,
} from "@/lib/tracking/types";

type PrismaLike = typeof prisma;

function toCheckProgressStatus(value: ProgressStatus): CheckProgressStatus {
  return value;
}

function toTaskPriority(value: TaskPriority): CheckTaskView["priority"] {
  return value;
}

function mapProgressSummary(
  progress: {
    trackingNumber: string;
    overallStatus: ProgressStatus;
    summary: string | null;
    etaLabel: string | null;
    adminNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null,
): OrderProgressSummary | null {
  if (!progress) {
    return null;
  }

  return {
    trackingNumber: progress.trackingNumber,
    overallStatus: toCheckProgressStatus(progress.overallStatus),
    summary: progress.summary,
    etaLabel: progress.etaLabel,
    adminNotes: progress.adminNotes,
    createdAt: progress.createdAt.toISOString(),
    updatedAt: progress.updatedAt.toISOString(),
  };
}

function mapCheck(
  check: {
    id: string;
    serviceKey: string;
    serviceLabel: string;
    status: ProgressStatus;
    timelineLabel: string | null;
    notes: string | null;
    fileUrl: string | null;
    sortOrder: number | null;
    createdAt: Date;
    updatedAt: Date;
  },
): CheckProgressView {
  return {
    id: check.id,
    serviceKey: check.serviceKey,
    serviceLabel: check.serviceLabel,
    status: toCheckProgressStatus(check.status),
    timelineLabel: check.timelineLabel,
    notes: check.notes,
    fileUrl: check.fileUrl,
    sortOrder: check.sortOrder,
    createdAt: check.createdAt.toISOString(),
    updatedAt: check.updatedAt.toISOString(),
  };
}

function mapStaff(
  staff:
    | {
        id: string;
        name: string;
        email: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
      }
    | null
    | undefined,
): StaffUserView | null {
  if (!staff) {
    return null;
  }

  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    isActive: staff.isActive,
    createdAt: staff.createdAt.toISOString(),
    updatedAt: staff.updatedAt.toISOString(),
  };
}

function mapTask(
  task: {
    id: string;
    title: string;
    description: string | null;
    status: ProgressStatus;
    priority: TaskPriority;
    publicStepNumber: number | null;
    dueDate: Date | null;
    notes: string | null;
    fileUrl: string | null;
    sortOrder: number | null;
    createdAt: Date;
    updatedAt: Date;
    assignee?: {
      id: string;
      name: string;
      email: string;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    } | null;
    checkTypeProgress: {
      id: string;
      serviceKey: string;
      serviceLabel: string;
    };
  },
): CheckTaskView {
  return {
    id: task.id,
    checkId: task.checkTypeProgress.id,
    serviceKey: task.checkTypeProgress.serviceKey,
    serviceLabel: task.checkTypeProgress.serviceLabel,
    title: task.title,
    description: task.description,
    status: toCheckProgressStatus(task.status),
    priority: toTaskPriority(task.priority),
    publicStepNumber: task.publicStepNumber,
    dueDate: task.dueDate?.toISOString() ?? null,
    notes: task.notes,
    fileUrl: task.fileUrl,
    sortOrder: task.sortOrder,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    assignee: mapStaff(task.assignee),
  };
}

function mapActivity(
  activity: {
    id: string;
    message: string;
    highlight: string | null;
    createdAt: Date;
  },
): ProgressActivityView {
  return {
    id: activity.id,
    message: activity.message,
    highlight: activity.highlight,
    createdAt: activity.createdAt.toISOString(),
  };
}

export function rollupProgressStatus(statuses: ProgressStatus[]) {
  if (statuses.length === 0) {
    return ProgressStatus.QUEUED;
  }

  if (statuses.every((status) => status === ProgressStatus.COMPLETED)) {
    return ProgressStatus.COMPLETED;
  }

  if (statuses.includes(ProgressStatus.ACTIVE_INVESTIGATION)) {
    return ProgressStatus.ACTIVE_INVESTIGATION;
  }

  if (statuses.includes(ProgressStatus.IN_PROGRESS)) {
    return ProgressStatus.IN_PROGRESS;
  }

  if (statuses.includes(ProgressStatus.ON_HOLD)) {
    return ProgressStatus.ON_HOLD;
  }

  return ProgressStatus.QUEUED;
}

export async function syncOrderProgressRollups(
  orderProgressId: string,
  db: PrismaLike = prisma,
) {
  const checks = await db.checkTypeProgress.findMany({
    where: { orderProgressId },
    select: { status: true },
  });

  const overallStatus = rollupProgressStatus(checks.map((check) => check.status));

  await db.orderProgress.update({
    where: { id: orderProgressId },
    data: { overallStatus },
  });
}

export async function syncCheckProgressRollups(
  checkId: string,
  db: PrismaLike = prisma,
) {
  const check = await db.checkTypeProgress.findUnique({
    where: { id: checkId },
    select: {
      id: true,
      orderProgressId: true,
      tasks: {
        select: {
          status: true,
        },
      },
    },
  });

  if (!check) {
    return;
  }

  if (check.tasks.length > 0) {
    await db.checkTypeProgress.update({
      where: { id: check.id },
      data: {
        status: rollupProgressStatus(check.tasks.map((task) => task.status)),
      },
    });
  }

  await syncOrderProgressRollups(check.orderProgressId, db);
}

export async function getOrderProgressByTrackingNumber(trackingNumber: string) {
  const progress = await prisma.orderProgress.findUnique({
    where: { trackingNumber },
    include: {
      checks: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      activities: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return {
    progress: mapProgressSummary(progress),
    checks: (progress?.checks ?? []).map(mapCheck),
    activities: (progress?.activities ?? []).map(mapActivity),
  };
}

export async function getOrderWorkflowTasks(trackingNumber: string) {
  const tasks = await prisma.checkTask.findMany({
    where: {
      checkTypeProgress: {
        orderProgress: {
          trackingNumber,
        },
      },
    },
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
    orderBy: [
      { status: "asc" },
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
  });

  return tasks.map(mapTask);
}

export async function getOrderPublicStepTasks(trackingNumber: string) {
  const tasks = await prisma.checkTask.findMany({
    where: {
      publicStepNumber: {
        not: null,
      },
      checkTypeProgress: {
        orderProgress: {
          trackingNumber,
        },
      },
    },
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
    orderBy: [
      { publicStepNumber: "asc" },
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
  });

  return tasks.map(mapTask);
}

export async function ensureOrderProgressForSnapshot(order: SheetOrderSnapshot) {
  await prisma.orderProgress.upsert({
    where: { trackingNumber: order.trackingNumber },
    create: { trackingNumber: order.trackingNumber },
    update: {},
  });

  return getOrderProgressByTrackingNumber(order.trackingNumber);
}
