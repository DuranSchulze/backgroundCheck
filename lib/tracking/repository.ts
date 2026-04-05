import { mockTrackingRecords } from "@/lib/tracking/mock-data";
import { normalizeReferenceNumber } from "@/lib/tracking/normalize";
import type { TrackingRecord, TrackingSample } from "@/lib/tracking/types";

type DataSource = "mock" | "google-sheets";

class TrackingConfigError extends Error {}

function getDataSource(): DataSource {
  return process.env.TRACKING_DATA_SOURCE === "google-sheets"
    ? "google-sheets"
    : "mock";
}

function mapToSample(record: TrackingRecord): TrackingSample {
  return {
    referenceNumber: record.referenceNumber,
    status: record.status,
    title: record.title,
    summary: record.summary,
  };
}

function findMockRecord(referenceNumber: string) {
  const normalizedReference = normalizeReferenceNumber(referenceNumber);

  return (
    mockTrackingRecords.find(
      (record) =>
        normalizeReferenceNumber(record.referenceNumber) === normalizedReference,
    ) ?? null
  );
}

function listMockSamples() {
  return mockTrackingRecords.map(mapToSample);
}

async function fetchGoogleSheetRows() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const range = process.env.GOOGLE_SHEETS_RANGE;
  const accessToken = process.env.GOOGLE_SHEETS_ACCESS_TOKEN;
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;

  if (!spreadsheetId || !range) {
    throw new TrackingConfigError(
      "Google Sheets is enabled, but GOOGLE_SHEETS_SPREADSHEET_ID or GOOGLE_SHEETS_RANGE is missing.",
    );
  }

  if (!accessToken && !apiKey) {
    throw new TrackingConfigError(
      "Google Sheets is enabled, but no GOOGLE_SHEETS_ACCESS_TOKEN or GOOGLE_SHEETS_API_KEY is configured.",
    );
  }

  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
  );

  if (apiKey) {
    url.searchParams.set("key", apiKey);
  }

  const response = await fetch(url, {
    headers: accessToken
      ? {
          Authorization: `Bearer ${accessToken}`,
        }
      : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Google Sheets request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as { values?: string[][] };
  return payload.values ?? [];
}

function parseJsonCell<T>(value: string, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseGoogleSheetRecords(values: string[][]): TrackingRecord[] {
  if (values.length <= 1) {
    return [];
  }

  const [headerRow, ...rows] = values;
  const headers = headerRow.map((value) => value.trim());

  return rows
    .map((row) => {
      const get = (columnName: string) => {
        const index = headers.indexOf(columnName);
        return index >= 0 ? row[index] ?? "" : "";
      };

      const record: TrackingRecord = {
        referenceNumber: get("referenceNumber"),
        status: (get("status") || "queued") as TrackingRecord["status"],
        title: get("title"),
        expectedCompletion: get("expectedCompletion"),
        percent: Number(get("percent") || 0),
        summary: get("summary"),
        metadataFields: parseJsonCell(get("metadataFields"), []),
        pipelineSteps: parseJsonCell(get("pipelineSteps"), []),
        recentActivity: parseJsonCell(get("recentActivity"), []),
      };

      return record.referenceNumber ? record : null;
    })
    .filter((record): record is TrackingRecord => record !== null);
}

async function findGoogleSheetsRecord(referenceNumber: string) {
  const normalizedReference = normalizeReferenceNumber(referenceNumber);
  const rows = await fetchGoogleSheetRows();
  const records = parseGoogleSheetRecords(rows);

  return (
    records.find(
      (record) =>
        normalizeReferenceNumber(record.referenceNumber) === normalizedReference,
    ) ?? null
  );
}

async function listGoogleSheetsSamples() {
  const rows = await fetchGoogleSheetRows();
  return parseGoogleSheetRecords(rows).map(mapToSample);
}

export async function findTrackingRecord(referenceNumber: string) {
  return getDataSource() === "google-sheets"
    ? findGoogleSheetsRecord(referenceNumber)
    : findMockRecord(referenceNumber);
}

export async function listTrackingSamples() {
  return getDataSource() === "google-sheets"
    ? listGoogleSheetsSamples()
    : listMockSamples();
}

export function isTrackingConfigError(error: unknown): error is TrackingConfigError {
  return error instanceof TrackingConfigError;
}
