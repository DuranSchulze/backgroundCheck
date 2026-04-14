import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  getReferenceAliases,
  normalizeReferenceNumber,
} from "@/lib/tracking/normalize";
import type { CheckCategory, SheetOrderSnapshot } from "@/lib/tracking/types";

type HeaderMap = Map<string, number>;

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

const GOOGLE_OAUTH_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

const CHECKBOX_COLUMN_MAP: Array<{ header: string; checkType: CheckCategory }> = [
  { header: "Individual & Identity Checks", checkType: "IDENTITY_CHECKS" },
  { header: "Verification Services", checkType: "VERIFICATION_SERVICES" },
  { header: "Legal & Immigration Checks", checkType: "LEGAL_IMMIGRATION_CHECKS" },
  {
    header: "Corporate & Financial Checks",
    checkType: "CORPORATE_FINANCIAL_CHECKS",
  },
  { header: "Specialized Checks", checkType: "SPECIALIZED_CHECKS" },
];

type ApiAuth =
  | { kind: "bearer"; token: string }
  | { kind: "apikey"; key: string };

type AuthCandidate = {
  label: string;
  getAuth: () => Promise<ApiAuth>;
};

let cachedToken: CachedToken | null = null;

export class GoogleSheetsConfigError extends Error {}

export class GoogleSheetsDataError extends Error {}

type GoogleCredentials = {
  clientEmail: string;
  privateKey: string;
};

function toBase64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

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

function getHeaderAliases(header: string) {
  const aliases = new Set<string>();
  const trimmed = header.trim();

  if (!trimmed) {
    return aliases;
  }

  const stem = trimmed.split("|")[0]?.trim() ?? trimmed;

  [trimmed, stem].forEach((value) => {
    if (!value) {
      return;
    }

    aliases.add(value);
    aliases.add(normalizeHeader(value));
    aliases.add(normalizeKey(value));
  });

  return aliases;
}

function parseGoogleCredentialsJson(
  rawJson: string,
  sourceLabel: string,
): GoogleCredentials {
  const parsed = JSON.parse(rawJson) as {
    client_email?: string;
    private_key?: string;
  };

  if (!parsed.client_email || !parsed.private_key) {
    throw new GoogleSheetsConfigError(
      `${sourceLabel} must include client_email and private_key.`,
    );
  }

  return {
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key,
  };
}

async function loadServiceAccountCredentials(): Promise<GoogleCredentials> {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();

  if (rawJson) {
    return parseGoogleCredentialsJson(rawJson, "GOOGLE_SERVICE_ACCOUNT_JSON");
  }

  const filePath =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_FILE?.trim() ||
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "public",
      "filepino-bgcheck-128c55091a24.json",
    );

  try {
    const fileContents = await readFile(filePath, "utf8");
    return parseGoogleCredentialsJson(fileContents, filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw new GoogleSheetsConfigError(
        `Unable to read Google service account file at ${filePath}.`,
      );
    }
  }

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );

  if (!clientEmail || !privateKey) {
    throw new GoogleSheetsConfigError(
      "Google service account credentials are missing. Set GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_SERVICE_ACCOUNT_JSON_FILE, or GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.",
    );
  }

  return { clientEmail, privateKey };
}

function getAuthCandidates(): AuthCandidate[] {
  const apiKey = process.env.GOOGLE_API_KEY?.trim();
  const candidates: AuthCandidate[] = [];

  if (apiKey) {
    candidates.push({
      label: "API key",
      getAuth: async () => ({ kind: "apikey", key: apiKey }),
    });
  }

  candidates.push({
    label: "service account",
    getAuth: async () => ({ kind: "bearer", token: await fetchGoogleAccessToken() }),
  });

  return candidates;
}

function applyAuth(url: URL, auth: ApiAuth): HeadersInit {
  if (auth.kind === "apikey") {
    url.searchParams.set("key", auth.key);
    return {};
  }

  return { Authorization: `Bearer ${auth.token}` };
}

async function fetchGoogleAccessToken() {
  const now = Date.now();

  if (cachedToken && cachedToken.expiresAt - 60_000 > now) {
    return cachedToken.accessToken;
  }

  const { clientEmail, privateKey } = await loadServiceAccountCredentials();
  const issuedAt = Math.floor(now / 1000);
  const expiresAt = issuedAt + 3600;

  const header = toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimSet = toBase64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: GOOGLE_OAUTH_SCOPE,
      aud: GOOGLE_TOKEN_ENDPOINT,
      exp: expiresAt,
      iat: issuedAt,
    }),
  );

  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claimSet}`);
  signer.end();
  const signature = toBase64Url(signer.sign(privateKey));
  const assertion = `${header}.${claimSet}.${signature}`;

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new GoogleSheetsConfigError(
      `Unable to obtain a Google Sheets access token (${response.status}): ${payload}`,
    );
  }

  const payload = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = {
    accessToken: payload.access_token,
    expiresAt: now + payload.expires_in * 1000,
  };

  return payload.access_token;
}

function getSheetConfig() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();

  if (!spreadsheetId) {
    throw new GoogleSheetsConfigError(
      "Google Sheets is enabled, but GOOGLE_SHEETS_SPREADSHEET_ID is missing.",
    );
  }

  return {
    spreadsheetId,
    range: process.env.GOOGLE_SHEETS_RANGE?.trim() || null,
  };
}

async function resolveSheetRange(spreadsheetId: string, auth: ApiAuth) {
  const configuredRange = process.env.GOOGLE_SHEETS_RANGE?.trim();

  if (configuredRange) {
    return configuredRange;
  }

  const metadataUrl = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
  );
  metadataUrl.searchParams.set("fields", "sheets(properties(title))");
  const metadataHeaders = applyAuth(metadataUrl, auth);

  const response = await fetch(metadataUrl, {
    headers: metadataHeaders,
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new GoogleSheetsDataError(
      `Unable to resolve the first Google Sheet tab (${response.status}): ${payload}`,
    );
  }

  const payload = (await response.json()) as {
    sheets?: Array<{
      properties?: {
        title?: string;
      };
    }>;
  };

  const firstSheetTitle = payload.sheets?.[0]?.properties?.title?.trim();

  if (!firstSheetTitle) {
    throw new GoogleSheetsDataError(
      "The configured Google spreadsheet does not have any readable tabs.",
    );
  }

  return `${firstSheetTitle}!A:ZZ`;
}

async function readSheetRowsWithAuth(params: {
  spreadsheetId: string;
  range: string | null;
  auth: ApiAuth;
}) {
  const { spreadsheetId, range, auth } = params;
  const resolvedRange = range || (await resolveSheetRange(spreadsheetId, auth));

  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(resolvedRange)}`,
  );
  const headers = applyAuth(url, auth);

  const response = await fetch(url, {
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new GoogleSheetsDataError(
      `Google Sheets request failed with status ${response.status}: ${payload}`,
    );
  }

  const payload = (await response.json()) as { values?: string[][] };
  return payload.values ?? [];
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function readSheetRows() {
  const { spreadsheetId, range } = getSheetConfig();
  const candidates = getAuthCandidates();
  const failures: string[] = [];

  if (candidates.length === 1) {
    const auth = await candidates[0].getAuth();
    return readSheetRowsWithAuth({ spreadsheetId, range, auth });
  }

  for (const candidate of candidates) {
    try {
      const auth = await candidate.getAuth();
      return await readSheetRowsWithAuth({ spreadsheetId, range, auth });
    } catch (error) {
      failures.push(`${candidate.label}: ${getErrorMessage(error)}`);
    }
  }

  throw new GoogleSheetsDataError(
    `Unable to read Google Sheets with any configured authentication method. Attempts: ${failures.join(" | ")}`,
  );
}

export function buildHeaderMap(headerRow: string[]) {
  const map: HeaderMap = new Map();

  headerRow.forEach((header, index) => {
    getHeaderAliases(header).forEach((alias) => {
      map.set(alias, index);
    });
  });

  return map;
}

export function getColumnIndex(headerMap: HeaderMap, columnName: string) {
  const normalizedHeader = normalizeHeader(columnName);
  const normalizedKey = normalizeKey(columnName);

  const index =
    headerMap.get(columnName) ??
    headerMap.get(normalizedHeader) ??
    headerMap.get(normalizedKey);

  return typeof index === "number" ? index : -1;
}

export function assertTrackingNumberColumn(headerRow: string[]) {
  const headerMap = buildHeaderMap(headerRow);

  if (getColumnIndex(headerMap, "Order Tracking Number") < 0) {
    throw new GoogleSheetsDataError(
      'The configured Google Sheet is missing the "Order Tracking Number" column.',
    );
  }
}

function getCellValue(row: string[], headerMap: HeaderMap, columnName: string) {
  const index = getColumnIndex(headerMap, columnName);
  return index >= 0 ? (row[index] ?? "").trim() : "";
}

function isSelected(value: string) {
  const normalized = value.trim().toLowerCase();
  return ["true", "yes", "y", "checked", "selected", "1", "on"].includes(normalized);
}

export function mapSheetRowToOrderSnapshot(headerRow: string[], row: string[]) {
  const headerMap = buildHeaderMap(headerRow);
  const trackingNumber = getCellValue(row, headerMap, "Order Tracking Number");

  if (!trackingNumber) {
    throw new GoogleSheetsDataError(
      "The sheet row is missing the Order Tracking Number value.",
    );
  }

  const selectedCheckCategories = CHECKBOX_COLUMN_MAP.filter(({ header }) =>
    isSelected(getCellValue(row, headerMap, header)),
  ).map(({ checkType }) => checkType);

  const rawFields = headerRow.reduce<Record<string, string>>((accumulator, header, index) => {
    const trimmed = header.trim();

    if (trimmed) {
      accumulator[trimmed] = (row[index] ?? "").trim();
    }

    return accumulator;
  }, {});

  return {
    trackingNumber,
    submitterName: getCellValue(row, headerMap, "Your complete name"),
    submitterEmail: getCellValue(row, headerMap, "Your email address"),
    companyName: getCellValue(row, headerMap, "Company name (if applicable)"),
    submitterPhone: getCellValue(row, headerMap, "Your phone number where to reach you"),
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
  } satisfies SheetOrderSnapshot;
}

export async function findOrderRowByTrackingNumber(trackingNumber: string) {
  const referenceAliases = getReferenceAliases(trackingNumber);
  const rows = await readSheetRows();

  if (rows.length === 0) {
    throw new GoogleSheetsDataError("The configured Google Sheet has no rows.");
  }

  const [headerRow, ...dataRows] = rows;
  const headerMap = buildHeaderMap(headerRow);
  assertTrackingNumberColumn(headerRow);

  const matchedRow = dataRows.find((row) => {
    const currentTrackingNumber = getCellValue(row, headerMap, "Order Tracking Number");
    return referenceAliases.has(normalizeReferenceNumber(currentTrackingNumber));
  });

  if (!matchedRow) {
    return null;
  }

  return mapSheetRowToOrderSnapshot(headerRow, matchedRow);
}

export async function listSheetOrderSnapshots() {
  const rows = await readSheetRows();

  if (rows.length <= 1) {
    return [];
  }

  const [headerRow, ...dataRows] = rows;
  const headerMap = buildHeaderMap(headerRow);
  assertTrackingNumberColumn(headerRow);

  return dataRows
    .filter((row) => getCellValue(row, headerMap, "Order Tracking Number"))
    .map((row) => mapSheetRowToOrderSnapshot(headerRow, row));
}
