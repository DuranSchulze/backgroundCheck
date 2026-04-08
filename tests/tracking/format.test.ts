import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTrackingRecord,
  buildTrackingSample,
} from "@/lib/tracking/format";
import type {
  CheckProgressView,
  OrderProgressSummary,
  SheetOrderSnapshot,
} from "@/lib/tracking/types";

const order: SheetOrderSnapshot = {
  trackingNumber: "ORD-1001",
  submitterName: "Juan Dela Cruz",
  submitterEmail: "juan@example.com",
  companyName: "FilePino",
  submitterPhone: "09171234567",
  subjectName: "Maria Santos",
  subjectEmail: "maria@example.com",
  subjectDateOfBirth: "1992-01-01",
  subjectPhone: "09991234567",
  currentAddress: "123 Main St",
  apartmentOrSuite: "Unit 5",
  city: "Makati",
  stateOrProvince: "Metro Manila",
  postalCode: "1200",
  country: "Philippines",
  purpose: "Employment",
  areaOfCheck: "Metro Manila",
  selectedCheckCategories: ["IDENTITY_CHECKS", "VERIFICATION_SERVICES"],
  rawFields: {},
};

test("buildTrackingRecord returns queued defaults when the sheet exists but no Prisma progress does", () => {
  const record = buildTrackingRecord({
    order,
    progress: null,
    checks: [],
    activities: [],
  });

  assert.equal(record.referenceNumber, "ORD-1001");
  assert.equal(record.status, "queued");
  assert.equal(record.percent, 0);
  assert.equal(record.pipelineSteps.length, 2);
  assert.match(record.summary, /ORD-1001/);
});

test("buildTrackingRecord merges overall progress, check progress, and activities", () => {
  const progress: OrderProgressSummary = {
    trackingNumber: "ORD-1001",
    overallStatus: "ACTIVE_INVESTIGATION",
    summary: "Field verification is underway.",
    etaLabel: "Apr 12, 2026",
    adminNotes: "Escalated for manual review",
    createdAt: new Date("2026-04-01T10:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-04-02T10:00:00.000Z").toISOString(),
  };

  const checks: CheckProgressView[] = [
    {
      id: "check-1",
      checkName: "Individual & Identity Checks",
      status: "COMPLETED",
      timelineLabel: "Completed Apr 1",
      notes: "Identity packet verified.",
      sortOrder: 0,
      createdAt: new Date("2026-04-01T10:00:00.000Z").toISOString(),
      updatedAt: new Date("2026-04-01T12:00:00.000Z").toISOString(),
    },
    {
      id: "check-2",
      checkName: "Verification Services",
      status: "ACTIVE_INVESTIGATION",
      timelineLabel: "Expected Apr 12",
      notes: "Employer outreach in progress.",
      sortOrder: 1,
      createdAt: new Date("2026-04-01T10:00:00.000Z").toISOString(),
      updatedAt: new Date("2026-04-02T12:00:00.000Z").toISOString(),
    },
  ];

  const record = buildTrackingRecord({
    order,
    progress,
    checks,
    activities: [
      {
        id: "activity-1",
        message: "Employer callback scheduled.",
        highlight: "Acme HR",
        createdAt: new Date("2026-04-02T12:30:00.000Z").toISOString(),
      },
    ],
  });

  assert.equal(record.status, "active-investigation");
  assert.equal(record.expectedCompletion, "Apr 12, 2026");
  assert.equal(record.percent, 75);
  assert.equal(record.pipelineSteps[0]?.status, "completed");
  assert.equal(record.pipelineSteps[1]?.status, "in-progress");
  assert.equal(record.recentActivity[0]?.highlight, "Acme HR");
});

test("buildTrackingSample reflects the live order with fallback naming", () => {
  const sample = buildTrackingSample({
    order: { ...order, subjectName: "", companyName: "" },
    progress: null,
  });

  assert.equal(sample.referenceNumber, "ORD-1001");
  assert.equal(sample.title, "Background Check Request");
  assert.equal(sample.status, "queued");
});
