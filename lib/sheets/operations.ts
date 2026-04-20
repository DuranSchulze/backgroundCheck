/**
 * Operations sheet — the staff-managed tracking / status spreadsheet.
 *
 * This module reads from and writes to the Google Sheet identified by
 * GOOGLE_SHEETS_OPERATIONS_ID. It is the primary status store for the app:
 * admin staff update each applicant's status here and the client-facing
 * tracker reads from it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EXPECTED SHEET STRUCTURE (single tab, flexible column order)
 * ─────────────────────────────────────────────────────────────────────────────
 * Required column:
 *   TrackingNumber
 *
 * Recognized columns (any column that is missing is treated as empty):
 *   ApplicantName
 *   Status           QUEUED | IN_PROGRESS | ACTIVE_INVESTIGATION | COMPLETED | ON_HOLD
 *   Summary
 *   ETA              Free-text ETA label (e.g. "Apr 30, 2026")
 *   Notes
 *   DriveFolderUrl   Optional QA override for the per-client Drive folder
 *   UpdatedAt        ISO timestamp, written automatically on upserts
 *
 * Column header matching is case-insensitive and tolerant of spaces / separators.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  appendRows,
  findDriveSubfolderByName,
  listDriveFolderChildren,
  parseDriveFolderId,
  readRange,
  resolveFirstTabRange,
  writeRange,
  type DriveFile,
} from "@/lib/sheets/client";
import {
  getOperationsSheetRange,
  getOperationsSheetId,
  getOptionalDriveRootFolderId,
} from "@/lib/sheets/config";
import { getReferenceAliases, normalizeReferenceNumber } from "@/lib/tracking/normalize";
import type {
  CheckProgressStatus,
  CheckProgressView,
  OrderProgressSummary,
  ProgressActivityView,
} from "@/lib/tracking/types";

// ─── Column metadata ─────────────────────────────────────────────────────────

type OperationsColumn =
  | "trackingNumber"
  | "applicantName"
  | "status"
  | "summary"
  | "eta"
  | "notes"
  | "driveFolderUrl"
  | "updatedAt";

interface ColumnSpec {
  key: OperationsColumn;
  /** Preferred header label used when writing new rows. */
  canonical: string;
  /** Accepted header aliases (normalized via normalizeHeader). */
  aliases: string[];
}

const COLUMN_SPECS: ColumnSpec[] = [
  {
    key: "trackingNumber",
    canonical: "TrackingNumber",
    aliases: [
      "trackingnumber",
      "tracking number",
      "order tracking number",
      "order id",
      "reference number",
      "ref",
    ],
  },
  {
    key: "applicantName",
    canonical: "ApplicantName",
    aliases: [
      "applicantname",
      "applicant name",
      "applicant",
      "name",
      "subject",
      "subject name",
      "full name",
      "complete name",
    ],
  },
  {
    key: "status",
    canonical: "Status",
    aliases: ["status", "overall status", "overallstatus", "stage", "state"],
  },
  {
    key: "summary",
    canonical: "Summary",
    aliases: ["summary", "summary note", "description"],
  },
  {
    key: "eta",
    canonical: "ETA",
    aliases: ["eta", "etalabel", "eta label", "expected", "expected completion"],
  },
  {
    key: "notes",
    canonical: "Notes",
    aliases: ["notes", "admin notes", "internal notes", "remarks"],
  },
  {
    key: "driveFolderUrl",
    canonical: "DriveFolderUrl",
    aliases: [
      "drivefolderurl",
      "drive folder url",
      "drive folder",
      "drive url",
      "folder url",
      "folder link",
      "drive link",
    ],
  },
  {
    key: "updatedAt",
    canonical: "UpdatedAt",
    aliases: ["updatedat", "updated at", "updated", "last updated"],
  },
];

const VALID_STATUSES: CheckProgressStatus[] = [
  "QUEUED",
  "IN_PROGRESS",
  "ACTIVE_INVESTIGATION",
  "COMPLETED",
  "ON_HOLD",
];

type HeaderIndex = Map<OperationsColumn, number>;

// ─── Internal helpers ────────────────────────────────────────────────────────

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[_|-]+/g, " ").replace(/\s+/g, " ");
}

function buildHeaderIndex(headerRow: string[]): HeaderIndex {
  const index: HeaderIndex = new Map();
  const normalizedHeaders = headerRow.map((header) => normalizeHeader(header));

  COLUMN_SPECS.forEach((spec) => {
    const aliasSet = new Set([spec.canonical.toLowerCase(), ...spec.aliases]);
    const matchedIdx = normalizedHeaders.findIndex((header) =>
      aliasSet.has(header),
    );
    if (matchedIdx >= 0) index.set(spec.key, matchedIdx);
  });

  return index;
}

function getCell(row: string[], headerIndex: HeaderIndex, key: OperationsColumn): string {
  const idx = headerIndex.get(key);
  return typeof idx === "number" ? (row[idx] ?? "").trim() : "";
}

function normalizeStatus(raw: string): CheckProgressStatus {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, "_");
  return (VALID_STATUSES as string[]).includes(cleaned)
    ? (cleaned as CheckProgressStatus)
    : "QUEUED";
}

async function readOperationsRows(): Promise<string[][]> {
  const spreadsheetId = getOperationsSheetId();
  const configuredRange = getOperationsSheetRange();
  const range = configuredRange ?? (await resolveFirstTabRange(spreadsheetId));
  return readRange(spreadsheetId, range);
}

async function resolveOperationsSheetTitle(): Promise<string> {
  const configured = getOperationsSheetRange();
  if (configured && configured.includes("!")) {
    return configured.split("!")[0];
  }
  const spreadsheetId = getOperationsSheetId();
  const fullRange = await resolveFirstTabRange(spreadsheetId);
  return fullRange.split("!")[0];
}

function findMatchingRowIndex(
  dataRows: string[][],
  headerIndex: HeaderIndex,
  trackingNumber: string,
): number {
  const aliases = getReferenceAliases(trackingNumber);
  return dataRows.findIndex((row) => {
    const cell = getCell(row, headerIndex, "trackingNumber");
    return cell && aliases.has(normalizeReferenceNumber(cell));
  });
}

// ─── Public read API ─────────────────────────────────────────────────────────

export interface OperationsRow {
  trackingNumber: string;
  applicantName: string;
  status: CheckProgressStatus;
  summary: string;
  eta: string;
  notes: string;
  driveFolderUrl: string;
  updatedAt: string;
}

function buildOperationsRow(
  headerIndex: HeaderIndex,
  row: string[],
): OperationsRow {
  return {
    trackingNumber: getCell(row, headerIndex, "trackingNumber"),
    applicantName: getCell(row, headerIndex, "applicantName"),
    status: normalizeStatus(getCell(row, headerIndex, "status")),
    summary: getCell(row, headerIndex, "summary"),
    eta: getCell(row, headerIndex, "eta"),
    notes: getCell(row, headerIndex, "notes"),
    driveFolderUrl: getCell(row, headerIndex, "driveFolderUrl"),
    updatedAt: getCell(row, headerIndex, "updatedAt"),
  };
}

/** Loads a single tracking row by tracking number, or null when not present. */
export async function findOperationsRow(
  trackingNumber: string,
): Promise<OperationsRow | null> {
  const rows = await readOperationsRows();
  if (rows.length === 0) return null;

  const [headerRow, ...dataRows] = rows;
  const headerIndex = buildHeaderIndex(headerRow);
  const matchedIndex = findMatchingRowIndex(dataRows, headerIndex, trackingNumber);
  return matchedIndex >= 0
    ? buildOperationsRow(headerIndex, dataRows[matchedIndex])
    : null;
}

/**
 * Returns the overall progress summary for a given tracking number.
 * Returns null when no row exists or the operations sheet is not configured.
 */
export async function getOrderProgress(
  trackingNumber: string,
): Promise<OrderProgressSummary | null> {
  const row = await findOperationsRow(trackingNumber);
  if (!row) return null;

  const now = new Date().toISOString();
  return {
    trackingNumber: row.trackingNumber,
    overallStatus: row.status,
    summary: row.summary || null,
    etaLabel: row.eta || null,
    adminNotes: row.notes || null,
    createdAt: row.updatedAt || now,
    updatedAt: row.updatedAt || now,
  };
}

/**
 * No per-category breakdown in the minimal schema — return empty so the UI
 * falls back to intake-declared categories.
 */
export async function getCheckProgress(
  _trackingNumber: string,
): Promise<CheckProgressView[]> {
  return [];
}

/** No activity log in the minimal schema. */
export async function getActivities(
  _trackingNumber: string,
): Promise<ProgressActivityView[]> {
  return [];
}

// ─── Public write API ────────────────────────────────────────────────────────

export interface OperationsUpsertInput {
  applicantName?: string;
  status?: CheckProgressStatus;
  summary?: string | null;
  eta?: string | null;
  notes?: string | null;
  driveFolderUrl?: string | null;
}

/**
 * Creates or updates the tracking row for a given tracking number.
 *
 * - If a matching row exists, its recognized columns are merged and written back.
 * - If no row exists, a new row is appended using the canonical headers.
 * - UpdatedAt is always set to the current ISO timestamp when present as a column.
 *
 * Missing recognized columns in the sheet are silently skipped — add them if
 * you want the corresponding field persisted.
 */
export async function upsertOperationsRow(
  trackingNumber: string,
  data: OperationsUpsertInput,
): Promise<OperationsRow> {
  const rows = await readOperationsRows();
  if (rows.length === 0) {
    throw new Error(
      "Operations sheet is empty — add a header row with at least TrackingNumber before upserting.",
    );
  }

  const [headerRow, ...dataRows] = rows;
  const headerIndex = buildHeaderIndex(headerRow);

  if (headerIndex.get("trackingNumber") === undefined) {
    throw new Error(
      'Operations sheet is missing the required "TrackingNumber" column.',
    );
  }

  const now = new Date().toISOString();
  const matchedIndex = findMatchingRowIndex(dataRows, headerIndex, trackingNumber);
  const existing =
    matchedIndex >= 0 ? dataRows[matchedIndex] : ([] as string[]);

  const width = headerRow.length;
  const nextRow = new Array<string>(width);
  for (let i = 0; i < width; i += 1) {
    nextRow[i] = (existing[i] ?? "").toString();
  }

  function setCell(key: OperationsColumn, value: string) {
    const idx = headerIndex.get(key);
    if (typeof idx === "number") nextRow[idx] = value;
  }

  setCell("trackingNumber", trackingNumber);
  if (data.applicantName !== undefined) setCell("applicantName", data.applicantName);
  if (data.status !== undefined) setCell("status", data.status);
  if (data.summary !== undefined) setCell("summary", data.summary ?? "");
  if (data.eta !== undefined) setCell("eta", data.eta ?? "");
  if (data.notes !== undefined) setCell("notes", data.notes ?? "");
  if (data.driveFolderUrl !== undefined)
    setCell("driveFolderUrl", data.driveFolderUrl ?? "");
  setCell("updatedAt", now);

  const spreadsheetId = getOperationsSheetId();
  const sheetTitle = await resolveOperationsSheetTitle();

  if (matchedIndex >= 0) {
    // Row numbers in A1 notation are 1-based; +2 accounts for the header row.
    const rowNumber = matchedIndex + 2;
    const writeRangeA1 = `${sheetTitle}!A${rowNumber}:${columnLetter(width)}${rowNumber}`;
    await writeRange(spreadsheetId, writeRangeA1, [nextRow]);
  } else {
    const appendRange = `${sheetTitle}!A1:${columnLetter(width)}1`;
    await appendRows(spreadsheetId, appendRange, [nextRow]);
  }

  return buildOperationsRow(headerIndex, nextRow);
}

/** Convenience alias kept for backward compatibility with earlier stubs. */
export async function upsertOrderProgress(
  trackingNumber: string,
  data: OperationsUpsertInput,
): Promise<void> {
  await upsertOperationsRow(trackingNumber, data);
}

/** No-op in the minimal schema. */
export async function upsertCheckProgress(): Promise<void> {
  // Intentionally empty — per-category breakdown lives on the intake sheet.
}

/** No-op in the minimal schema. */
export async function appendActivity(): Promise<void> {
  // Intentionally empty — activity logging is not part of the minimal schema.
}

// ─── Drive folder resolution ─────────────────────────────────────────────────

export interface OrderDriveBundle {
  folder: DriveFile | { id: string; name: string; url: string } | null;
  folderUrl: string | null;
  files: DriveFile[];
  source: "override" | "root-search" | "none";
}

/**
 * Resolves the Drive folder (and its top-level files) belonging to a given
 * tracking number.
 *
 * Resolution order:
 *   1. DriveFolderUrl override from the tracking sheet row (QA correction).
 *   2. Subfolder of GOOGLE_DRIVE_FOLDER_ID whose name contains the tracking
 *      number or the applicant name (case-insensitive substring match).
 *
 * Returns an empty bundle when neither source is available or configured.
 */
export async function getOrderDriveFolder(
  trackingNumber: string,
  applicantName?: string | null,
): Promise<OrderDriveBundle> {
  const row = await findOperationsRow(trackingNumber).catch(() => null);
  const overrideId = parseDriveFolderId(row?.driveFolderUrl);

  if (overrideId && row) {
    try {
      const files = await listDriveFolderChildren(overrideId);
      return {
        folder: {
          id: overrideId,
          name: row.applicantName || trackingNumber,
          url: row.driveFolderUrl,
        },
        folderUrl: row.driveFolderUrl,
        files,
        source: "override",
      };
    } catch {
      // Fall through to root search if the override is unreachable.
    }
  }

  const rootId = getOptionalDriveRootFolderId();
  if (!rootId) {
    return { folder: null, folderUrl: null, files: [], source: "none" };
  }

  const candidates = [
    trackingNumber,
    ...getReferenceAliases(trackingNumber),
    applicantName ?? "",
    row?.applicantName ?? "",
  ].filter((value): value is string => Boolean(value));

  const folder = await findDriveSubfolderByName(rootId, candidates).catch(
    () => null,
  );

  if (!folder) {
    return { folder: null, folderUrl: null, files: [], source: "none" };
  }

  const files = await listDriveFolderChildren(folder.id).catch(() => []);
  return {
    folder,
    folderUrl: folder.webViewLink ?? null,
    files,
    source: "root-search",
  };
}

// ─── A1-notation helpers ─────────────────────────────────────────────────────

function columnLetter(columnIndex: number): string {
  let n = columnIndex;
  let result = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result || "A";
}
