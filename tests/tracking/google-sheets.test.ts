import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import {
  assertTrackingNumberColumn,
  buildHeaderMap,
  getColumnIndex,
  mapSheetRowToOrderSnapshot,
  readSheetRows,
} from "@/lib/tracking/google-sheets";
import { getReferenceAliases } from "@/lib/tracking/normalize";

const headerRow = [
  "Your complete name|text-1",
  "Your email address|email-1",
  "Complete legal name, eg First, Middle and Last Name|text-2",
  "Purpose|select-1",
  "Individual & Identity Checks|checkbox-1",
  "Verification Services|checkbox-2",
  "Area where background check will be performed|radio-3",
  "Order Tracking Number|hidden-1",
];

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const testPrivateKey = privateKey.export({
  type: "pkcs8",
  format: "pem",
});

const googleEnvKeys = [
  "GOOGLE_API_KEY",
  "GOOGLE_SHEETS_SPREADSHEET_ID",
  "GOOGLE_SHEETS_RANGE",
  "GOOGLE_SERVICE_ACCOUNT_JSON",
  "GOOGLE_SERVICE_ACCOUNT_JSON_FILE",
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
] as const;

function snapshotGoogleEnv() {
  return Object.fromEntries(
    googleEnvKeys.map((key) => [key, process.env[key]]),
  ) as Record<(typeof googleEnvKeys)[number], string | undefined>;
}

function restoreGoogleEnv(snapshot: ReturnType<typeof snapshotGoogleEnv>) {
  googleEnvKeys.forEach((key) => {
    const value = snapshot[key];

    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });
}

function setServiceAccountEnv() {
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
    client_email: "sheets-reader@example.iam.gserviceaccount.com",
    private_key: testPrivateKey,
  });
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status });
}

function textResponse(payload: string, status: number) {
  return new Response(payload, { status });
}

async function withMockedGoogleFetch<T>(
  handler: (url: URL, init?: RequestInit) => Response,
  callback: (requests: Array<{ url: URL; init?: RequestInit }>) => Promise<T>,
) {
  const originalFetch = globalThis.fetch;
  const envSnapshot = snapshotGoogleEnv();
  const requests: Array<{ url: URL; init?: RequestInit }> = [];

  globalThis.fetch = (async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    requests.push({ url, init });
    return handler(url, init);
  }) as typeof fetch;

  try {
    return await callback(requests);
  } finally {
    globalThis.fetch = originalFetch;
    restoreGoogleEnv(envSnapshot);
  }
}

test("buildHeaderMap resolves suffixed headers through the human-readable label", () => {
  const headerMap = buildHeaderMap(headerRow);

  assert.equal(getColumnIndex(headerMap, "Order Tracking Number"), 7);
  assert.equal(getColumnIndex(headerMap, "Your complete name"), 0);
  assert.equal(getColumnIndex(headerMap, "Verification Services"), 5);
});

test("assertTrackingNumberColumn throws when the sheet does not include the join column", () => {
  assert.throws(
    () => assertTrackingNumberColumn(["Purpose|select-1", "Your complete name|text-1"]),
    /Order Tracking Number/,
  );
});

test("mapSheetRowToOrderSnapshot parses a valid intake row", () => {
  const row = [
    "Juan Dela Cruz",
    "juan@example.com",
    "Maria Santos",
    "Employment",
    "true",
    "checked",
    "Metro Manila",
    "ORD-1001",
  ];

  const snapshot = mapSheetRowToOrderSnapshot(headerRow, row);

  assert.equal(snapshot.trackingNumber, "ORD-1001");
  assert.equal(snapshot.submitterName, "Juan Dela Cruz");
  assert.equal(snapshot.subjectName, "Maria Santos");
  assert.equal(snapshot.purpose, "Employment");
  assert.equal(snapshot.areaOfCheck, "Metro Manila");
  assert.deepEqual(snapshot.selectedCheckCategories, [
    "IDENTITY_CHECKS",
    "VERIFICATION_SERVICES",
  ]);
});

test("mapSheetRowToOrderSnapshot rejects rows without a tracking number value", () => {
  assert.throws(
    () =>
      mapSheetRowToOrderSnapshot(headerRow, [
        "Juan Dela Cruz",
        "juan@example.com",
        "Maria Santos",
        "Employment",
        "",
        "",
        "Metro Manila",
        "",
      ]),
    /Order Tracking Number/,
  );
});

test("getReferenceAliases matches numeric order references with ORD-prefixed values", () => {
  assert.deepEqual(
    [...getReferenceAliases("307")].sort(),
    ["307", "ORD-307"],
  );

  assert.deepEqual(
    [...getReferenceAliases("ord-307")].sort(),
    ["307", "ORD-307"],
  );
});

test("readSheetRows uses the API key first when it succeeds", async () => {
  await withMockedGoogleFetch(
    (url) => {
      assert.equal(url.searchParams.get("key"), "test-api-key");
      assert.match(url.pathname, /\/values\/Tracking!A1%3AZZ$/);
      return jsonResponse({ values: [headerRow] });
    },
    async (requests) => {
      process.env.GOOGLE_API_KEY = "test-api-key";
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID = "sheet-123";
      process.env.GOOGLE_SHEETS_RANGE = "Tracking!A1:ZZ";
      delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON_FILE;
      delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      delete process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

      const rows = await readSheetRows();

      assert.deepEqual(rows, [headerRow]);
      assert.equal(requests.length, 1);
      assert.equal(
        requests.some((request) =>
          request.url.href.includes("oauth2.googleapis.com/token"),
        ),
        false,
      );
    },
  );
});

test("readSheetRows retries with the service account when API-key values fail", async () => {
  await withMockedGoogleFetch(
    (url, init) => {
      if (url.href.includes("oauth2.googleapis.com/token")) {
        return jsonResponse({ access_token: "service-token", expires_in: 3600 });
      }

      if (url.searchParams.get("key") === "bad-api-key") {
        return textResponse("API key rejected", 403);
      }

      assert.equal(
        (init?.headers as Record<string, string> | undefined)?.Authorization,
        "Bearer service-token",
      );
      return jsonResponse({ values: [headerRow, ["value"]] });
    },
    async (requests) => {
      process.env.GOOGLE_API_KEY = "bad-api-key";
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID = "sheet-123";
      process.env.GOOGLE_SHEETS_RANGE = "Tracking!A1:ZZ";
      setServiceAccountEnv();

      const rows = await readSheetRows();

      assert.deepEqual(rows, [headerRow, ["value"]]);
      assert.equal(
        requests.filter((request) => request.url.pathname.includes("/values/"))
          .length,
        2,
      );
      assert.equal(
        requests.some((request) =>
          request.url.href.includes("oauth2.googleapis.com/token"),
        ),
        true,
      );
    },
  );
});

test("readSheetRows retries range resolution with the service account after API-key metadata failure", async () => {
  await withMockedGoogleFetch(
    (url, init) => {
      if (url.href.includes("oauth2.googleapis.com/token")) {
        return jsonResponse({ access_token: "service-token", expires_in: 3600 });
      }

      if (
        url.pathname === "/v4/spreadsheets/sheet-123" &&
        url.searchParams.get("key") === "bad-api-key"
      ) {
        return textResponse("metadata denied", 403);
      }

      if (url.pathname === "/v4/spreadsheets/sheet-123") {
        assert.equal(
          (init?.headers as Record<string, string> | undefined)?.Authorization,
          "Bearer service-token",
        );
        return jsonResponse({
          sheets: [{ properties: { title: "Tracking" } }],
        });
      }

      assert.match(url.pathname, /\/values\/Tracking!A%3AZZ$/);
      return jsonResponse({ values: [headerRow] });
    },
    async () => {
      process.env.GOOGLE_API_KEY = "bad-api-key";
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID = "sheet-123";
      delete process.env.GOOGLE_SHEETS_RANGE;
      setServiceAccountEnv();

      const rows = await readSheetRows();

      assert.deepEqual(rows, [headerRow]);
    },
  );
});

test("readSheetRows reports both auth attempts when API key and service account fail", async () => {
  await withMockedGoogleFetch(
    (url) => {
      if (url.href.includes("oauth2.googleapis.com/token")) {
        return jsonResponse({ access_token: "service-token", expires_in: 3600 });
      }

      if (url.searchParams.get("key") === "bad-api-key") {
        return textResponse("API key rejected", 403);
      }

      return textResponse("service account rejected", 500);
    },
    async () => {
      process.env.GOOGLE_API_KEY = "bad-api-key";
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID = "sheet-123";
      process.env.GOOGLE_SHEETS_RANGE = "Tracking!A1:ZZ";
      setServiceAccountEnv();

      await assert.rejects(readSheetRows(), (error) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /API key/);
        assert.match(error.message, /service account/);
        assert.match(error.message, /API key rejected/);
        assert.match(error.message, /service account rejected/);
        return true;
      });
    },
  );
});

test("readSheetRows uses service-account auth when no API key is configured", async () => {
  await withMockedGoogleFetch(
    (url, init) => {
      if (url.href.includes("oauth2.googleapis.com/token")) {
        return jsonResponse({ access_token: "service-token", expires_in: 3600 });
      }

      assert.equal(url.searchParams.get("key"), null);
      assert.equal(
        (init?.headers as Record<string, string> | undefined)?.Authorization,
        "Bearer service-token",
      );
      return jsonResponse({ values: [headerRow] });
    },
    async (requests) => {
      delete process.env.GOOGLE_API_KEY;
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID = "sheet-123";
      process.env.GOOGLE_SHEETS_RANGE = "Tracking!A1:ZZ";
      setServiceAccountEnv();

      const rows = await readSheetRows();

      assert.deepEqual(rows, [headerRow]);
      assert.equal(
        requests.some((request) => request.url.searchParams.has("key")),
        false,
      );
    },
  );
});
