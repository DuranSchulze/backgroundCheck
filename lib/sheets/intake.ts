/**
 * Intake sheet reader — the Google Form responses spreadsheet (read-only).
 *
 * This sheet is written to by Google Forms when clients submit background check
 * requests. We only ever read from it; order progress is stored separately in
 * the operations sheet (see lib/sheets/operations.ts).
 *
 * Configured by: GOOGLE_SHEETS_SPREADSHEET_ID
 * Optional range: GOOGLE_SHEETS_RANGE (auto-detects the first tab if omitted)
 */

import {
  readRange,
  resolveFirstTabRange,
  SheetsApiError,
} from "@/lib/sheets/client";
import {
  getIntakeSheetId,
  getIntakeSheetRange,
  SheetsConfigError,
} from "@/lib/sheets/config";
import {
  getReferenceAliases,
  normalizeReferenceNumber,
} from "@/lib/tracking/normalize";
import type { CheckCategory, SheetOrderSnapshot } from "@/lib/tracking/types";

export { SheetsApiError, SheetsConfigError };

type HeaderMap = Map<string, number>;

const CHECKBOX_COLUMN_MAP: Array<{
  header: string;
  checkType: CheckCategory;
}> = [
  { header: "Individual & Identity Checks", checkType: "IDENTITY_CHECKS" },
  { header: "Verification Services", checkType: "VERIFICATION_SERVICES" },
  {
    header: "Legal & Immigration Checks",
    checkType: "LEGAL_IMMIGRATION_CHECKS",
  },
  {
    header: "Corporate & Financial Checks",
    checkType: "CORPORATE_FINANCIAL_CHECKS",
  },
  { header: "Specialized Checks", checkType: "SPECIALIZED_CHECKS" },
];

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\|/g, " | ");
}

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[|:]/g, "")
    .replace(/[^a-z0-9 ]/g, "");
}

function getHeaderAliases(header: string): Set<string> {
  const aliases = new Set<string>();
  const trimmed = header.trim();
  if (!trimmed) return aliases;

  const stem = trimmed.split("|")[0]?.trim() ?? trimmed;
  for (const value of [trimmed, stem]) {
    if (!value) continue;
    aliases.add(value);
    aliases.add(normalizeHeader(value));
    aliases.add(normalizeKey(value));
  }
  return aliases;
}

export function buildHeaderMap(headerRow: string[]): HeaderMap {
  const map: HeaderMap = new Map();
  headerRow.forEach((header, index) => {
    getHeaderAliases(header).forEach((alias) => map.set(alias, index));
  });
  return map;
}

export function getColumnIndex(
  headerMap: HeaderMap,
  columnName: string,
): number {
  const index =
    headerMap.get(columnName) ??
    headerMap.get(normalizeHeader(columnName)) ??
    headerMap.get(normalizeKey(columnName));
  return typeof index === "number" ? index : -1;
}

function getCellValue(
  row: string[],
  headerMap: HeaderMap,
  columnName: string,
): string {
  const index = getColumnIndex(headerMap, columnName);
  return index >= 0 ? (row[index] ?? "").trim() : "";
}

function isSelected(value: string): boolean {
  return ["true", "yes", "y", "checked", "selected", "1", "on"].includes(
    value.trim().toLowerCase(),
  );
}

function assertTrackingNumberColumn(headerRow: string[]): void {
  const headerMap = buildHeaderMap(headerRow);
  if (getColumnIndex(headerMap, "Order Tracking Number") < 0) {
    throw new SheetsApiError(
      'The intake sheet is missing the "Order Tracking Number" column.',
    );
  }
}

export function mapRowToOrderSnapshot(
  headerRow: string[],
  row: string[],
): SheetOrderSnapshot {
  const headerMap = buildHeaderMap(headerRow);
  const trackingNumber = getCellValue(row, headerMap, "Order Tracking Number");

  if (!trackingNumber) {
    throw new SheetsApiError("Sheet row is missing Order Tracking Number.");
  }

  const selectedCheckCategories = CHECKBOX_COLUMN_MAP.filter(({ header }) =>
    isSelected(getCellValue(row, headerMap, header)),
  ).map(({ checkType }) => checkType);

  const rawFields = headerRow.reduce<Record<string, string>>(
    (acc, header, index) => {
      const trimmed = header.trim();
      if (trimmed) acc[trimmed] = (row[index] ?? "").trim();
      return acc;
    },
    {},
  );

  return {
    trackingNumber,
    submitterName: getCellValue(row, headerMap, "Your complete name"),
    submitterEmail: getCellValue(row, headerMap, "Your email address"),
    companyName: getCellValue(row, headerMap, "Company name (if applicable)"),
    submitterPhone: getCellValue(
      row,
      headerMap,
      "Your phone number where to reach you",
    ),
    subjectName: getCellValue(
      row,
      headerMap,
      "Complete legal name, eg First, Middle and Last Name",
    ),
    subjectEmail: getCellValue(row, headerMap, "Email address"),
    subjectDateOfBirth: getCellValue(row, headerMap, "Date of Birth"),
    subjectPhone: getCellValue(row, headerMap, "Phone number"),
    currentAddress: getCellValue(row, headerMap, "Current address"),
    apartmentOrSuite: getCellValue(row, headerMap, "Apartment, suite, etc"),
    city: getCellValue(row, headerMap, "City"),
    stateOrProvince: getCellValue(row, headerMap, "State/Province"),
    postalCode: getCellValue(row, headerMap, "ZIP / Postal Code"),
    country: getCellValue(row, headerMap, "Country"),
    purpose: getCellValue(row, headerMap, "Purpose"),
    areaOfCheck: getCellValue(
      row,
      headerMap,
      "Area where background check will be performed",
    ),
    selectedCheckCategories,
    rawFields,
  };
}

async function readIntakeRows(): Promise<string[][]> {
  const spreadsheetId = getIntakeSheetId();
  const configuredRange = getIntakeSheetRange();
  const range =
    configuredRange ?? (await resolveFirstTabRange(spreadsheetId));
  return readRange(spreadsheetId, range);
}

/** Finds an order row by tracking number (supports all reference number aliases). */
export async function findOrderByTrackingNumber(
  trackingNumber: string,
): Promise<SheetOrderSnapshot | null> {
  const aliases = getReferenceAliases(trackingNumber);
  const rows = await readIntakeRows();

  if (rows.length === 0) return null;

  const [headerRow, ...dataRows] = rows;
  assertTrackingNumberColumn(headerRow);

  const headerMap = buildHeaderMap(headerRow);
  const matched = dataRows.find((row) => {
    const cell = getCellValue(row, headerMap, "Order Tracking Number");
    return aliases.has(normalizeReferenceNumber(cell));
  });

  return matched ? mapRowToOrderSnapshot(headerRow, matched) : null;
}

/** Lists all orders in the intake sheet (rows with a tracking number). */
export async function listOrders(): Promise<SheetOrderSnapshot[]> {
  const rows = await readIntakeRows();
  if (rows.length <= 1) return [];

  const [headerRow, ...dataRows] = rows;
  assertTrackingNumberColumn(headerRow);
  const headerMap = buildHeaderMap(headerRow);

  return dataRows
    .filter((row) => getCellValue(row, headerMap, "Order Tracking Number"))
    .map((row) => mapRowToOrderSnapshot(headerRow, row));
}
