import { readFile } from "node:fs/promises";
import path from "node:path";

export class SheetsConfigError extends Error {}

export type GoogleCredentials = {
  clientEmail: string;
  privateKey: string;
};

function parseCredentialsJson(rawJson: string, label: string): GoogleCredentials {
  const parsed = JSON.parse(rawJson) as {
    client_email?: string;
    private_key?: string;
  };

  if (!parsed.client_email || !parsed.private_key) {
    throw new SheetsConfigError(
      `${label} must contain "client_email" and "private_key".`,
    );
  }

  return {
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key,
  };
}

/**
 * Loads Google service account credentials from env vars or a local file.
 *
 * Resolution order:
 *   1. GOOGLE_SERVICE_ACCOUNT_JSON — full JSON string (ideal for Vercel secrets)
 *   2. GOOGLE_SERVICE_ACCOUNT_JSON_FILE — path to a local .json file
 *   3. service-account.json in the project root (local development fallback)
 *   4. GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY — individual fields
 */
export async function loadCredentials(): Promise<GoogleCredentials> {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (rawJson) {
    return parseCredentialsJson(rawJson, "GOOGLE_SERVICE_ACCOUNT_JSON");
  }

  const filePath =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_FILE?.trim() ||
    path.join(/* turbopackIgnore: true */ process.cwd(), "service-account.json");

  try {
    const fileContents = await readFile(filePath, "utf8");
    return parseCredentialsJson(fileContents, filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw new SheetsConfigError(
        `Unable to read service account file at ${filePath}: ${String(error)}`,
      );
    }
  }

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );

  if (!clientEmail || !privateKey) {
    throw new SheetsConfigError(
      "Google credentials are missing. Set one of: " +
        "GOOGLE_SERVICE_ACCOUNT_JSON, " +
        "GOOGLE_SERVICE_ACCOUNT_JSON_FILE, " +
        "or both GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.",
    );
  }

  return { clientEmail, privateKey };
}

/**
 * Returns the Google API key if set (read-only, no write support).
 * When present, the client prefers this over the service account for GET requests.
 */
export function getApiKey(): string | null {
  return process.env.GOOGLE_API_KEY?.trim() || null;
}

/**
 * GOOGLE_SHEETS_SPREADSHEET_ID — the intake / order form sheet (read-only).
 * This is the sheet where clients submit background check requests via Google Forms.
 */
export function getIntakeSheetId(): string {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
  if (!id) {
    throw new SheetsConfigError(
      "GOOGLE_SHEETS_SPREADSHEET_ID is not set. " +
        "Set it to the spreadsheet ID of the Google Form responses sheet.",
    );
  }
  return id;
}

/**
 * GOOGLE_SHEETS_OPERATIONS_ID — the operations / progress sheet (read + write).
 * This is the sheet managed by staff to track order statuses, check progress, and activity logs.
 */
export function getOperationsSheetId(): string {
  const id = process.env.GOOGLE_SHEETS_OPERATIONS_ID?.trim();
  if (!id) {
    throw new SheetsConfigError(
      "GOOGLE_SHEETS_OPERATIONS_ID is not set. " +
        "Set it to the spreadsheet ID of your operations tracking sheet.",
    );
  }
  return id;
}

/** Optional range override for the intake sheet (e.g. "Sheet1!A:Z"). Auto-detected if omitted. */
export function getIntakeSheetRange(): string | null {
  return process.env.GOOGLE_SHEETS_RANGE?.trim() || null;
}
