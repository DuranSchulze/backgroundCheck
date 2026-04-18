/**
 * Operations sheet — the staff-managed progress tracking spreadsheet (read + write).
 *
 * This module will be the primary interface to the Google Sheet identified by
 * GOOGLE_SHEETS_OPERATIONS_ID. Staff will update this sheet to reflect order
 * statuses, check-level progress, and activity notes visible to clients.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EXPECTED SHEET STRUCTURE (three tabs)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Tab: "Orders"
 *   TrackingNumber | OverallStatus | Summary | ETALabel | AdminNotes | UpdatedAt
 *
 *   OverallStatus values: QUEUED | IN_PROGRESS | ACTIVE_INVESTIGATION | COMPLETED | ON_HOLD
 *
 * Tab: "Checks"
 *   ID | TrackingNumber | ServiceKey | ServiceLabel | Status | TimelineLabel | Notes | FileUrl | SortOrder | UpdatedAt
 *
 *   ServiceKey values: IDENTITY_CHECKS | VERIFICATION_SERVICES | LEGAL_IMMIGRATION_CHECKS |
 *                      CORPORATE_FINANCIAL_CHECKS | SPECIALIZED_CHECKS
 *   Status values: same as OverallStatus
 *
 * Tab: "Activities"
 *   ID | TrackingNumber | Message | Highlight | CreatedAt
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IMPLEMENTATION STATUS: STUB
 * ─────────────────────────────────────────────────────────────────────────────
 * All functions currently return null / empty data and are no-ops on write.
 * Implement each function once the operations sheet is created and
 * GOOGLE_SHEETS_OPERATIONS_ID is configured.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  CheckProgressStatus,
  CheckProgressView,
  OrderProgressSummary,
  ProgressActivityView,
} from "@/lib/tracking/types";

// ─── Types for operations sheet rows ─────────────────────────────────────────

export interface OrderProgressRow {
  trackingNumber: string;
  overallStatus: CheckProgressStatus;
  summary: string | null;
  etaLabel: string | null;
  adminNotes: string | null;
  updatedAt: string;
}

export interface CheckProgressRow {
  id: string;
  trackingNumber: string;
  serviceKey: string;
  serviceLabel: string;
  status: CheckProgressStatus;
  timelineLabel: string | null;
  notes: string | null;
  fileUrl: string | null;
  sortOrder: number | null;
  updatedAt: string;
}

export interface ActivityRow {
  id: string;
  trackingNumber: string;
  message: string;
  highlight: string | null;
  createdAt: string;
}

// ─── Read operations ──────────────────────────────────────────────────────────

/**
 * Returns the overall progress summary for a given tracking number.
 * Returns null when no operations sheet is configured or the row does not exist.
 *
 * TODO: implement by reading the "Orders" tab from GOOGLE_SHEETS_OPERATIONS_ID,
 * finding the row where TrackingNumber matches, and mapping it to OrderProgressSummary.
 */
export async function getOrderProgress(
  _trackingNumber: string,
): Promise<OrderProgressSummary | null> {
  return null;
}

/**
 * Returns the list of check-level progress rows for a given tracking number.
 *
 * TODO: implement by reading the "Checks" tab from GOOGLE_SHEETS_OPERATIONS_ID,
 * filtering rows where TrackingNumber matches.
 */
export async function getCheckProgress(
  _trackingNumber: string,
): Promise<CheckProgressView[]> {
  return [];
}

/**
 * Returns the activity log for a given tracking number, newest first.
 *
 * TODO: implement by reading the "Activities" tab from GOOGLE_SHEETS_OPERATIONS_ID,
 * filtering + sorting by CreatedAt descending.
 */
export async function getActivities(
  _trackingNumber: string,
): Promise<ProgressActivityView[]> {
  return [];
}

// ─── Write operations ─────────────────────────────────────────────────────────

/**
 * Creates or updates the overall progress row for a tracking number.
 *
 * TODO: implement using writeRange / appendRows on the "Orders" tab.
 * Look up existing row by TrackingNumber; update in-place if found, append if not.
 */
export async function upsertOrderProgress(
  _trackingNumber: string,
  _data: Partial<Omit<OrderProgressRow, "trackingNumber" | "updatedAt">>,
): Promise<void> {
  // stub — no-op until operations sheet is configured
}

/**
 * Creates or updates a check progress row for a specific service key.
 *
 * TODO: implement using writeRange / appendRows on the "Checks" tab.
 * Identify row by TrackingNumber + ServiceKey composite.
 */
export async function upsertCheckProgress(
  _trackingNumber: string,
  _data: Omit<CheckProgressRow, "trackingNumber" | "updatedAt">,
): Promise<void> {
  // stub — no-op until operations sheet is configured
}

/**
 * Appends a new activity entry to the "Activities" tab.
 *
 * TODO: implement using appendRows on the "Activities" tab.
 * Generate a unique ID (e.g. crypto.randomUUID()) and set CreatedAt to now.
 */
export async function appendActivity(
  _trackingNumber: string,
  _message: string,
  _highlight?: string,
): Promise<void> {
  // stub — no-op until operations sheet is configured
}
