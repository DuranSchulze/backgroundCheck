import { CheckCategory, ProgressStatus } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type {
  CheckProgressStatus,
  CheckProgressView,
  CheckCategory as CheckCategoryValue,
  OrderProgressSummary,
  ProgressActivityView,
  SheetOrderSnapshot,
} from "@/lib/tracking/types";

const CHECK_CATEGORY_ORDER: CheckCategoryValue[] = [
  "IDENTITY_CHECKS",
  "VERIFICATION_SERVICES",
  "LEGAL_IMMIGRATION_CHECKS",
  "CORPORATE_FINANCIAL_CHECKS",
  "SPECIALIZED_CHECKS",
];

function toPrismaCheckCategory(value: CheckCategoryValue) {
  return CheckCategory[value];
}

function toCheckProgressStatus(value: ProgressStatus): CheckProgressStatus {
  return value;
}

export function getCheckCategorySortOrder(checkType: CheckCategoryValue) {
  const index = CHECK_CATEGORY_ORDER.indexOf(checkType);
  return index >= 0 ? index : CHECK_CATEGORY_ORDER.length;
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
    checkType: CheckCategory;
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
    checkType: check.checkType,
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
  const progress = await prisma.orderProgress.upsert({
    where: { trackingNumber: order.trackingNumber },
    create: {
      trackingNumber: order.trackingNumber,
    },
    update: {},
  });

  if (order.selectedCheckCategories.length > 0) {
    await Promise.all(
      order.selectedCheckCategories.map((checkType) =>
        prisma.checkTypeProgress.upsert({
          where: {
            orderProgressId_checkType: {
              orderProgressId: progress.id,
              checkType: toPrismaCheckCategory(checkType),
            },
          },
          create: {
            orderProgressId: progress.id,
            checkType: toPrismaCheckCategory(checkType),
            sortOrder: getCheckCategorySortOrder(checkType),
          },
          update: {
            sortOrder: getCheckCategorySortOrder(checkType),
          },
        }),
      ),
    );
  }

  return getOrderProgressByTrackingNumber(order.trackingNumber);
}
