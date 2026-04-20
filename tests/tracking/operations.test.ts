import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";

const googleEnvKeys = [
  "GOOGLE_API_KEY",
  "GOOGLE_SHEETS_SPREADSHEET_ID",
  "GOOGLE_SHEETS_RANGE",
  "GOOGLE_SHEETS_OPERATIONS_ID",
  "GOOGLE_SHEETS_OPERATIONS_RANGE",
  "GOOGLE_DRIVE_FOLDER_ID",
  "GOOGLE_SERVICE_ACCOUNT_JSON",
  "GOOGLE_SERVICE_ACCOUNT_JSON_FILE",
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
] as const;

function snapshotEnv() {
  return Object.fromEntries(
    googleEnvKeys.map((key) => [key, process.env[key]]),
  ) as Record<(typeof googleEnvKeys)[number], string | undefined>;
}

function restoreEnv(snapshot: ReturnType<typeof snapshotEnv>) {
  googleEnvKeys.forEach((key) => {
    const value = snapshot[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });
}

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const testPrivateKey = privateKey.export({ type: "pkcs8", format: "pem" });

function resetGoogleEnv() {
  googleEnvKeys.forEach((key) => {
    delete process.env[key];
  });
}

function setServiceAccountEnv() {
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
    client_email: "ops@example.iam.gserviceaccount.com",
    private_key: testPrivateKey,
  });
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status });
}

interface MockedCall {
  url: URL;
  init?: RequestInit;
}

async function withMockedGoogleFetch<T>(
  handler: (url: URL, init?: RequestInit) => Response | Promise<Response>,
  callback: (calls: MockedCall[]) => Promise<T>,
): Promise<T> {
  const originalFetch = globalThis.fetch;
  const envSnapshot = snapshotEnv();
  const calls: MockedCall[] = [];

  globalThis.fetch = (async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    calls.push({ url, init });
    return handler(url, init);
  }) as typeof fetch;

  try {
    return await callback(calls);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv(envSnapshot);
  }
}

test("getOrderProgress reads the tracking row by tracking number", async () => {
  await withMockedGoogleFetch(
    (url) => {
      if (url.href.includes("oauth2.googleapis.com/token")) {
        return jsonResponse({ access_token: "token", expires_in: 3600 });
      }
      if (url.pathname.includes("/values/")) {
        return jsonResponse({
          values: [
            [
              "TrackingNumber",
              "ApplicantName",
              "Status",
              "Summary",
              "ETA",
              "Notes",
              "DriveFolderUrl",
              "UpdatedAt",
            ],
            [
              "ORD-1001",
              "Maria Santos",
              "Active Investigation",
              "Field verification in progress.",
              "Apr 30, 2026",
              "Escalated.",
              "",
              "2026-04-01T00:00:00.000Z",
            ],
          ],
        });
      }
      throw new Error(`Unexpected URL: ${url.href}`);
    },
    async () => {
      resetGoogleEnv();
      process.env.GOOGLE_SHEETS_OPERATIONS_ID = "ops-sheet";
      process.env.GOOGLE_SHEETS_OPERATIONS_RANGE = "Tracking!A:Z";
      setServiceAccountEnv();

      const { getOrderProgress } = await import("@/lib/sheets/operations");
      const progress = await getOrderProgress("ORD-1001");

      assert.ok(progress);
      assert.equal(progress?.overallStatus, "ACTIVE_INVESTIGATION");
      assert.equal(progress?.summary, "Field verification in progress.");
      assert.equal(progress?.etaLabel, "Apr 30, 2026");
      assert.equal(progress?.adminNotes, "Escalated.");
    },
  );
});

test("findOperationsRow matches numeric tracking aliases", async () => {
  await withMockedGoogleFetch(
    (url) => {
      if (url.href.includes("oauth2.googleapis.com/token")) {
        return jsonResponse({ access_token: "token", expires_in: 3600 });
      }
      return jsonResponse({
        values: [
          ["TrackingNumber", "ApplicantName", "Status"],
          ["307", "John Doe", "COMPLETED"],
        ],
      });
    },
    async () => {
      resetGoogleEnv();
      process.env.GOOGLE_SHEETS_OPERATIONS_ID = "ops-sheet";
      process.env.GOOGLE_SHEETS_OPERATIONS_RANGE = "Tracking!A:Z";
      setServiceAccountEnv();

      const { findOperationsRow } = await import("@/lib/sheets/operations");
      const row = await findOperationsRow("ORD-307");
      assert.equal(row?.trackingNumber, "307");
      assert.equal(row?.applicantName, "John Doe");
      assert.equal(row?.status, "COMPLETED");
    },
  );
});

test("getOrderDriveFolder prefers the per-row DriveFolderUrl override", async () => {
  await withMockedGoogleFetch(
    (url) => {
      if (url.href.includes("oauth2.googleapis.com/token")) {
        return jsonResponse({ access_token: "token", expires_in: 3600 });
      }
      if (url.hostname === "sheets.googleapis.com") {
        return jsonResponse({
          values: [
            [
              "TrackingNumber",
              "ApplicantName",
              "Status",
              "DriveFolderUrl",
            ],
            [
              "ORD-1001",
              "Maria Santos",
              "IN_PROGRESS",
              "https://drive.google.com/drive/folders/override-folder-id",
            ],
          ],
        });
      }
      if (url.hostname === "www.googleapis.com" && url.pathname.endsWith("/files")) {
        return jsonResponse({
          files: [
            {
              id: "file-1",
              name: "report.pdf",
              mimeType: "application/pdf",
              webViewLink: "https://drive.google.com/file/d/file-1/view",
              webContentLink: null,
              modifiedTime: "2026-04-02T00:00:00.000Z",
              iconLink: null,
              size: "2048",
            },
          ],
        });
      }
      throw new Error(`Unexpected URL: ${url.href}`);
    },
    async (calls) => {
      resetGoogleEnv();
      process.env.GOOGLE_SHEETS_OPERATIONS_ID = "ops-sheet";
      process.env.GOOGLE_SHEETS_OPERATIONS_RANGE = "Tracking!A:Z";
      process.env.GOOGLE_DRIVE_FOLDER_ID = "root-folder-id";
      setServiceAccountEnv();

      const { getOrderDriveFolder } = await import("@/lib/sheets/operations");
      const bundle = await getOrderDriveFolder("ORD-1001");

      assert.equal(bundle.source, "override");
      assert.equal(bundle.files.length, 1);
      assert.equal(bundle.files[0]?.name, "report.pdf");

      const driveCalls = calls.filter(
        (call) => call.url.hostname === "www.googleapis.com",
      );
      // Only the override folder should be queried — never the root folder.
      assert.ok(
        driveCalls.every((call) =>
          call.url.searchParams.get("q")?.includes("override-folder-id"),
        ),
      );
    },
  );
});

test("getOrderDriveFolder falls back to searching the root folder by tracking number", async () => {
  await withMockedGoogleFetch(
    (url) => {
      if (url.href.includes("oauth2.googleapis.com/token")) {
        return jsonResponse({ access_token: "token", expires_in: 3600 });
      }
      if (url.hostname === "sheets.googleapis.com") {
        return jsonResponse({
          values: [
            ["TrackingNumber", "ApplicantName", "Status"],
            ["ORD-2042", "Alex Cruz", "QUEUED"],
          ],
        });
      }
      if (url.hostname === "www.googleapis.com" && url.pathname.endsWith("/files")) {
        const query = url.searchParams.get("q") ?? "";
        if (query.includes("root-folder-id")) {
          return jsonResponse({
            files: [
              {
                id: "subfolder-1",
                name: "Alex Cruz · ORD-2042",
                mimeType: "application/vnd.google-apps.folder",
                webViewLink: "https://drive.google.com/drive/folders/subfolder-1",
                webContentLink: null,
                modifiedTime: null,
                iconLink: null,
                size: null,
              },
            ],
          });
        }
        if (query.includes("subfolder-1")) {
          return jsonResponse({
            files: [
              {
                id: "file-a",
                name: "id-copy.jpg",
                mimeType: "image/jpeg",
                webViewLink: "https://drive.google.com/file/d/file-a/view",
                webContentLink: null,
                modifiedTime: null,
                iconLink: null,
                size: "1024",
              },
            ],
          });
        }
      }
      throw new Error(`Unexpected URL: ${url.href}`);
    },
    async () => {
      resetGoogleEnv();
      process.env.GOOGLE_SHEETS_OPERATIONS_ID = "ops-sheet";
      process.env.GOOGLE_SHEETS_OPERATIONS_RANGE = "Tracking!A:Z";
      process.env.GOOGLE_DRIVE_FOLDER_ID = "root-folder-id";
      setServiceAccountEnv();

      const { getOrderDriveFolder } = await import("@/lib/sheets/operations");
      const bundle = await getOrderDriveFolder("ORD-2042", "Alex Cruz");

      assert.equal(bundle.source, "root-search");
      assert.equal(bundle.files.length, 1);
      assert.equal(bundle.files[0]?.name, "id-copy.jpg");
      assert.equal(
        bundle.folderUrl,
        "https://drive.google.com/drive/folders/subfolder-1",
      );
    },
  );
});

test("parseDriveFolderId extracts ids from URLs", async () => {
  const { parseDriveFolderId } = await import("@/lib/sheets/client");
  assert.equal(
    parseDriveFolderId("https://drive.google.com/drive/folders/abc123XYZ-_"),
    "abc123XYZ-_",
  );
  assert.equal(
    parseDriveFolderId("https://drive.google.com/open?id=abc123XYZ-_"),
    "abc123XYZ-_",
  );
  assert.equal(parseDriveFolderId("abc123XYZ-_long_enough_id"), "abc123XYZ-_long_enough_id");
  assert.equal(parseDriveFolderId(""), null);
  assert.equal(parseDriveFolderId(null), null);
});
