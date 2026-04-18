import { createSign } from "node:crypto";
import { getApiKey, loadCredentials } from "@/lib/sheets/config";

// Full spreadsheets scope — required for both read and write operations.
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
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
