import { ProgressStatus } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type {
  CheckProgressStatus,
  CheckProgressView,
  OrderProgressSummary,
  ProgressActivityView,
  SheetOrderSnapshot,
} from "@/lib/tracking/types";

function toCheckProgressStatus(value: ProgressStatus): CheckProgressStatus {
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
    checkName: string;
    status: ProgressStatus;
    timelineLabel: string | null;
    notes: string | null;
    sortOrder: number | null;
    createdAt: Date;
    updatedAt: Date;
  },
): CheckProgressView {
  return {
    id: check.id,
    checkName: check.checkName,
    status: toCheckProgressStatus(check.status),
    timelineLabel: check.timelineLabel,
    notes: check.notes,
    sortOrder: check.sortOrder,
    createdAt: check.createdAt.toISOString(),
    updatedAt: check.updatedAt.toISOString(),
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

export async function ensureOrderProgressForSnapshot(order: SheetOrderSnapshot) {
  await prisma.orderProgress.upsert({
    where: { trackingNumber: order.trackingNumber },
    create: { trackingNumber: order.trackingNumber },
    update: {},
  });

  return getOrderProgressByTrackingNumber(order.trackingNumber);
}
