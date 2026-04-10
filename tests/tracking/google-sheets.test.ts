import test from "node:test";
import assert from "node:assert/strict";
import {
  assertTrackingNumberColumn,
  buildHeaderMap,
  getColumnIndex,
  mapSheetRowToOrderSnapshot,
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
