import type {
  ActivityItem,
  CheckCategory,
  CheckProgressStatus,
  CheckProgressView,
  MetadataField,
  OrderProgressSummary,
  PipelineStepData,
  ProgressActivityView,
  SheetOrderSnapshot,
  TrackingRecord,
  TrackingSample,
  TrackingStatus,
} from "@/lib/tracking/types";

const CHECK_CATEGORY_LABELS: Record<CheckCategory, string> = {
  IDENTITY_CHECKS: "Individual & Identity Checks",
  VERIFICATION_SERVICES: "Verification Services",
  LEGAL_IMMIGRATION_CHECKS: "Legal & Immigration Checks",
  CORPORATE_FINANCIAL_CHECKS: "Corporate & Financial Checks",
  SPECIALIZED_CHECKS: "Specialized Checks",
};

const TRACKING_STATUS_LABELS: Record<TrackingStatus, string> = {
  queued: "Queued for Processing",
  "in-progress": "Background Check In Progress",
  "active-investigation": "Active Investigation",
  completed: "Background Check Complete",
};

function formatAddress(order: SheetOrderSnapshot) {
  return [
    order.currentAddress,
    order.apartmentOrSuite,
    order.city,
    order.stateOrProvince,
    order.postalCode,
    order.country,
  ]
    .filter(Boolean)
    .join(", ");
}

export function getCheckCategoryLabel(checkType: CheckCategory) {
  return CHECK_CATEGORY_LABELS[checkType];
}

export function stripColumnSuffix(header: string): string {
  return header.split("|")[0].trim();
}

export function getCheckedColumnLabels(rawFields: Record<string, string>): string[] {
  return Object.entries(rawFields)
    .filter(([key]) => /\|checkbox-/i.test(key))
    .filter(([, value]) => value.trim().length > 0)
    .map(([key]) => stripColumnSuffix(key))
    .filter(Boolean);
}

export function getCheckedColumnDetails(
  rawFields: Record<string, string>,
): Array<{ label: string; value: string }> {
  return Object.entries(rawFields)
    .filter(([key]) => /\|checkbox-/i.test(key))
    .filter(([, value]) => value.trim().length > 0)
    .map(([key, value]) => ({ label: stripColumnSuffix(key), value: value.trim() }))
    .filter((item) => item.label.length > 0);
}

export function getUploadFields(
  rawFields: Record<string, string>,
): Array<{ label: string; url: string }> {
  return Object.entries(rawFields)
    .filter(([key]) => /\|upload-/i.test(key))
    .filter(([, value]) => value.trim().length > 0)
    .map(([key, value]) => ({ label: stripColumnSuffix(key), url: value.trim() }))
    .filter((item) => item.label.length > 0);
}

export function mapProgressStatusToTrackingStatus(
  status: CheckProgressStatus | null,
): TrackingStatus {
  switch (status) {
    case "COMPLETED":
      return "completed";
    case "ACTIVE_INVESTIGATION":
      return "active-investigation";
    case "IN_PROGRESS":
      return "in-progress";
    default:
      return "queued";
  }
}

export function mapCheckStatusToPipelineStatus(
  status: CheckProgressStatus,
): PipelineStepData["status"] {
  switch (status) {
    case "COMPLETED":
      return "completed";
    case "IN_PROGRESS":
    case "ACTIVE_INVESTIGATION":
      return "in-progress";
    default:
      return "queued";
  }
}

export function buildTrackingMetadata(order: SheetOrderSnapshot): MetadataField[] {
  return [
    { label: "Tracking Number", value: order.trackingNumber },
    { label: "Subject Name", value: order.subjectName || "Not provided" },
    { label: "Submitted By", value: order.submitterName || "Not provided" },
    { label: "Purpose", value: order.purpose || "Not provided" },
    {
      label: "Area of Check",
      value: order.areaOfCheck || "Not provided",
    },
    {
      label: "Current Address",
      value: formatAddress(order) || "Not provided",
    },
    {
      label: "Selected Checks",
      value:
        order.selectedCheckCategories.length > 0
          ? order.selectedCheckCategories.map(getCheckCategoryLabel).join(", ")
          : "No categories selected in intake",
    },
    {
      label: "Requestor Email",
      value: order.submitterEmail || "Not provided",
    },
  ];
}

export function buildPipelineSteps(
  order: SheetOrderSnapshot,
  checks: CheckProgressView[],
): PipelineStepData[] {
  const selectedChecks =
    checks.length > 0
      ? checks
      : order.selectedCheckCategories.map((checkType, index) => ({
          id: `generated-${checkType}`,
          checkName: getCheckCategoryLabel(checkType),
          status: "QUEUED" as const,
          timelineLabel: null,
          notes: null,
          sortOrder: index,
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
        }));

  return selectedChecks.map((check) => ({
    id: check.id,
    title: check.checkName,
    description:
      check.notes ||
      check.timelineLabel ||
      "This background-check component is queued for case processing.",
    status: mapCheckStatusToPipelineStatus(check.status),
  }));
}

export function calculateProgressPercent(
  overallStatus: OrderProgressSummary | null,
  checks: CheckProgressView[],
) {
  if (checks.length > 0) {
    const completed = checks.filter((check) => check.status === "COMPLETED").length;
    const active = checks.filter(
      (check) =>
        check.status === "IN_PROGRESS" || check.status === "ACTIVE_INVESTIGATION",
    ).length;

    const score = completed + active * 0.5;
    return Math.round((score / checks.length) * 100);
  }

  const status = overallStatus?.overallStatus ?? "QUEUED";

  switch (status) {
    case "COMPLETED":
      return 100;
    case "ACTIVE_INVESTIGATION":
      return 75;
    case "IN_PROGRESS":
      return 50;
    default:
      return 0;
  }
}

export function buildSummary(
  order: SheetOrderSnapshot,
  progress: OrderProgressSummary | null,
) {
  if (progress?.summary) {
    return progress.summary;
  }

  const checksSummary =
    order.selectedCheckCategories.length > 0
      ? `${order.selectedCheckCategories.length} verification stream${
          order.selectedCheckCategories.length > 1 ? "s are" : " is"
        } included in this request.`
      : "No verification categories were marked on the intake row yet.";

  return `${checksSummary} This order is being managed under tracking number ${order.trackingNumber}.`;
}

export function buildActivityFeed(
  order: SheetOrderSnapshot,
  activities: ProgressActivityView[],
): ActivityItem[] {
  if (activities.length > 0) {
    return activities.map((activity) => ({
      id: activity.id,
      time: new Date(activity.createdAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      description: activity.message,
      highlight: activity.highlight ?? undefined,
    }));
  }

  return [
    {
      id: `${order.trackingNumber}-submitted`,
      time: "New",
      description: "Order intake found in Google Sheets and ready for admin updates.",
      highlight: order.submitterName || order.subjectName || undefined,
    },
  ];
}

export function buildTrackingRecord(params: {
  order: SheetOrderSnapshot;
  progress: OrderProgressSummary | null;
  checks: CheckProgressView[];
  activities: ProgressActivityView[];
}): TrackingRecord {
  const status = mapProgressStatusToTrackingStatus(params.progress?.overallStatus ?? null);
  const percent = calculateProgressPercent(params.progress, params.checks);

  return {
    referenceNumber: params.order.trackingNumber,
    status,
    title: TRACKING_STATUS_LABELS[status],
    expectedCompletion: params.progress?.etaLabel || "Awaiting admin schedule",
    percent,
    summary: buildSummary(params.order, params.progress),
    metadataFields: buildTrackingMetadata(params.order),
    pipelineSteps: buildPipelineSteps(params.order, params.checks),
    recentActivity: buildActivityFeed(params.order, params.activities),
  };
}

export function buildTrackingSample(params: {
  order: SheetOrderSnapshot;
  progress: OrderProgressSummary | null;
}): TrackingSample {
  const status = mapProgressStatusToTrackingStatus(params.progress?.overallStatus ?? null);

  return {
    referenceNumber: params.order.trackingNumber,
    status,
    title:
      params.order.subjectName ||
      params.order.companyName ||
      "Background Check Request",
    summary: buildSummary(params.order, params.progress),
  };
}
