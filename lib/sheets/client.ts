import { createSign } from "node:crypto";
import { getApiKey, loadCredentials } from "@/lib/sheets/config";

// Full spreadsheets scope (read/write) plus Drive read-only for file listing.
const SHEETS_SCOPE = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.readonly",
].join(" ");
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export class SheetsApiError extends Error {}

type Auth =
  | { kind: "bearer"; token: string }
  | { kind: "apikey"; key: string };

type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

let tokenCache: TokenCache | null = null;

function toBase64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getServiceAccountToken(): Promise<string> {
  const now = Date.now();

  if (tokenCache && tokenCache.expiresAt - 60_000 > now) {
    return tokenCache.accessToken;
  }

  const { clientEmail, privateKey } = await loadCredentials();
  const iat = Math.floor(now / 1000);
  const exp = iat + 3600;

  const header = toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = toBase64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: SHEETS_SCOPE,
      aud: TOKEN_ENDPOINT,
      exp,
      iat,
    }),
  );

  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  signer.end();
  const sig = toBase64Url(signer.sign(privateKey));
  const assertion = `${header}.${claim}.${sig}`;

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new SheetsApiError(
      `Google token request failed (${response.status}): ${body}`,
    );
  }

  const payload = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: now + payload.expires_in * 1000,
  };

  return payload.access_token;
}

async function resolveAuth(): Promise<Auth> {
  const apiKey = getApiKey();
  if (apiKey) return { kind: "apikey", key: apiKey };
  return { kind: "bearer", token: await getServiceAccountToken() };
}

function applyAuth(url: URL, auth: Auth): HeadersInit {
  if (auth.kind === "apikey") {
    url.searchParams.set("key", auth.key);
    return {};
  }
  return { Authorization: `Bearer ${auth.token}` };
}

/** Resolves the full A:ZZ range for the first tab in a spreadsheet. */
export async function resolveFirstTabRange(spreadsheetId: string): Promise<string> {
  const auth = await resolveAuth();
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
  );
  url.searchParams.set("fields", "sheets(properties(title))");
  const headers = applyAuth(url, auth);

  const response = await fetch(url, { headers, cache: "no-store" });
  if (!response.ok) {
    throw new SheetsApiError(
      `Spreadsheet metadata fetch failed (${response.status}): ${await response.text()}`,
    );
  }

  const payload = (await response.json()) as {
    sheets?: Array<{ properties?: { title?: string } }>;
  };

  const title = payload.sheets?.[0]?.properties?.title?.trim();
  if (!title) throw new SheetsApiError("Spreadsheet has no readable tabs.");
  return `${title}!A:ZZ`;
}

/** Reads a range of values from a spreadsheet. Returns rows as string[][]. */
export async function readRange(
  spreadsheetId: string,
  range: string,
): Promise<string[][]> {
  const auth = await resolveAuth();
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
  );
  const headers = applyAuth(url, auth);

  const response = await fetch(url, { headers, cache: "no-store" });
  if (!response.ok) {
    throw new SheetsApiError(
      `Read failed (${response.status}): ${await response.text()}`,
    );
  }

  const payload = (await response.json()) as { values?: string[][] };
  return payload.values ?? [];
}

/**
 * Overwrites a range with the given values (PUT).
 * Requires a service account — API key auth is read-only.
 */
export async function writeRange(
  spreadsheetId: string,
  range: string,
  values: string[][],
): Promise<void> {
  const auth = await resolveAuth();
  if (auth.kind === "apikey") {
    throw new SheetsApiError(
      "API key auth is read-only. Provide a service account to write data.",
    );
  }

  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
  );
  url.searchParams.set("valueInputOption", "USER_ENTERED");

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      ...applyAuth(url, auth),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ range, majorDimension: "ROWS", values }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new SheetsApiError(
      `Write failed (${response.status}): ${await response.text()}`,
    );
  }
}

/**
 * Appends rows below the last row with data in the given range (POST append).
 * Requires a service account — API key auth is read-only.
 */
export async function appendRows(
  spreadsheetId: string,
  range: string,
  values: string[][],
): Promise<void> {
  const auth = await resolveAuth();
  if (auth.kind === "apikey") {
    throw new SheetsApiError(
      "API key auth is read-only. Provide a service account to append rows.",
    );
  }

  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append`,
  );
  url.searchParams.set("valueInputOption", "USER_ENTERED");
  url.searchParams.set("insertDataOption", "INSERT_ROWS");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...applyAuth(url, auth),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ majorDimension: "ROWS", values }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new SheetsApiError(
      `Append failed (${response.status}): ${await response.text()}`,
    );
  }
}

// ─── Google Drive helpers ─────────────────────────────────────────────────────

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string | null;
  webContentLink: string | null;
  modifiedTime: string | null;
  iconLink: string | null;
  size: string | null;
}

const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
const DRIVE_FILE_FIELDS =
  "id,name,mimeType,webViewLink,webContentLink,modifiedTime,iconLink,size";

/**
 * Lists files/folders inside a given Drive folder (non-trashed).
 * Returns top-level children only.
 */
export async function listDriveFolderChildren(
  folderId: string,
): Promise<DriveFile[]> {
  const auth = await resolveAuth();
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set(
    "q",
    `'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false`,
  );
  url.searchParams.set("fields", `files(${DRIVE_FILE_FIELDS})`);
  url.searchParams.set("pageSize", "200");
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("includeItemsFromAllDrives", "true");
  const headers = applyAuth(url, auth);

  const response = await fetch(url, { headers, cache: "no-store" });
  if (!response.ok) {
    throw new SheetsApiError(
      `Drive list failed (${response.status}): ${await response.text()}`,
    );
  }

  const payload = (await response.json()) as { files?: DriveFile[] };
  return payload.files ?? [];
}

/**
 * Finds a direct child folder of `parentFolderId` whose name matches one of the
 * supplied candidate strings (case-insensitive, trimmed). Returns null if none.
 */
export async function findDriveSubfolderByName(
  parentFolderId: string,
  candidates: string[],
): Promise<DriveFile | null> {
  const normalized = candidates
    .map((candidate) => candidate?.trim().toLowerCase())
    .filter((candidate): candidate is string => Boolean(candidate));

  if (normalized.length === 0) return null;

  const children = await listDriveFolderChildren(parentFolderId);
  return (
    children.find(
      (item) =>
        item.mimeType === DRIVE_FOLDER_MIME &&
        normalized.some((candidate) =>
          item.name.trim().toLowerCase().includes(candidate),
        ),
    ) ?? null
  );
}

/**
 * Extracts a Drive folder/file ID from a typical Drive URL, or returns the
 * string untouched if it already looks like an ID. Returns null on bad input.
 */
export function parseDriveFolderId(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];

  const openIdMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openIdMatch) return openIdMatch[1];

  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed;

  return null;
}
