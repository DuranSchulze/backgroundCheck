import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "@/app/api/tracking/route";

test("GET /api/tracking returns a mock record when the reference exists", async () => {
  process.env.TRACKING_DATA_SOURCE = "mock";

  const response = await GET(
    new Request("http://localhost/api/tracking?referenceNumber=BG-7742-VERIF"),
  );
  const payload = (await response.json()) as {
    record?: { referenceNumber: string };
  };

  assert.equal(response.status, 200);
  assert.equal(payload.record?.referenceNumber, "BG-7742-VERIF");
});

test("GET /api/tracking returns 404 when the reference is missing", async () => {
  process.env.TRACKING_DATA_SOURCE = "mock";

  const response = await GET(
    new Request("http://localhost/api/tracking?referenceNumber=NOT-REAL"),
  );
  const payload = (await response.json()) as { error?: string };

  assert.equal(response.status, 404);
  assert.match(payload.error ?? "", /not found/i);
});
