import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTrackingRecord,
  buildTrackingSample,
} from "@/lib/tracking/format";
import type {
  CheckProgressView,
  CheckTaskView,
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
    tasks: [],
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
      serviceKey: "IDENTITY_CHECKS",
      serviceLabel: "Individual & Identity Checks",
      status: "COMPLETED",
      timelineLabel: "Completed Apr 1",
      notes: "Identity packet verified.",
      fileUrl: "https://drive.google.com/check-1",
      sortOrder: 0,
      createdAt: new Date("2026-04-01T10:00:00.000Z").toISOString(),
      updatedAt: new Date("2026-04-01T12:00:00.000Z").toISOString(),
    },
    {
      id: "check-2",
      serviceKey: "VERIFICATION_SERVICES",
      serviceLabel: "Verification Services",
      status: "ACTIVE_INVESTIGATION",
      timelineLabel: "Expected Apr 12",
      notes: "Employer outreach in progress.",
      fileUrl: null,
      sortOrder: 1,
      createdAt: new Date("2026-04-01T10:00:00.000Z").toISOString(),
      updatedAt: new Date("2026-04-02T12:00:00.000Z").toISOString(),
    },
  ];

  const record = buildTrackingRecord({
    order,
    progress,
    checks,
    tasks: [],
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
  assert.equal(record.checks[0]?.label, "Individual & Identity Checks");
  assert.equal(record.checks[0]?.overall, "Completed");
  assert.equal(record.checks[0]?.remarks, "Identity packet verified.");
  assert.equal(record.checks[0]?.fileUrl, "https://drive.google.com/check-1");
  assert.equal(record.checks[1]?.fileUrl, null);
  assert.equal(record.recentActivity[0]?.highlight, "Acme HR");
});

test("buildTrackingRecord prefers numbered public tasks for pipeline steps", () => {
  const tasks: CheckTaskView[] = [
    {
      id: "task-2",
      checkId: "check-2",
      serviceKey: "VERIFICATION_SERVICES",
      serviceLabel: "Verification Services",
      title: "Confirm employer response",
      description: "Waiting for employer confirmation.",
      status: "ACTIVE_INVESTIGATION",
      priority: "HIGH",
      publicStepNumber: 2,
      dueDate: null,
      notes: null,
      fileUrl: null,
      sortOrder: 1,
      createdAt: new Date("2026-04-02T10:00:00.000Z").toISOString(),
      updatedAt: new Date("2026-04-02T10:00:00.000Z").toISOString(),
      assignee: null,
    },
    {
      id: "task-1",
      checkId: "check-1",
      serviceKey: "IDENTITY_CHECKS",
      serviceLabel: "Individual & Identity Checks",
      title: "Verify government ID",
      description: "",
      status: "COMPLETED",
      priority: "MEDIUM",
      publicStepNumber: 1,
      dueDate: null,
      notes: "Government ID already matched.",
      fileUrl: "https://example.com/task-1.pdf",
      sortOrder: 0,
      createdAt: new Date("2026-04-01T10:00:00.000Z").toISOString(),
      updatedAt: new Date("2026-04-01T10:00:00.000Z").toISOString(),
      assignee: null,
    },
    {
      id: "task-internal",
      checkId: "check-2",
      serviceKey: "VERIFICATION_SERVICES",
      serviceLabel: "Verification Services",
      title: "Internal note task",
      description: "Should not show publicly.",
      status: "IN_PROGRESS",
      priority: "LOW",
      publicStepNumber: null,
      dueDate: null,
      notes: null,
      fileUrl: "https://example.com/internal.pdf",
      sortOrder: 2,
      createdAt: new Date("2026-04-02T11:00:00.000Z").toISOString(),
      updatedAt: new Date("2026-04-02T11:00:00.000Z").toISOString(),
      assignee: null,
    },
  ];

  const record = buildTrackingRecord({
    order,
    progress: null,
    checks: [],
    tasks,
    activities: [],
  });

  assert.equal(record.pipelineSteps.length, 2);
  assert.equal(record.pipelineSteps[0]?.title, "Step #1 · Verify government ID");
  assert.equal(record.pipelineSteps[0]?.status, "completed");
  assert.equal(record.pipelineSteps[0]?.description, "Government ID already matched.");
  assert.equal(record.pipelineSteps[1]?.title, "Step #2 · Confirm employer response");
  assert.equal(record.pipelineSteps[1]?.status, "in-progress");
  assert.equal(record.checks[0]?.tasks[0]?.label, "#1");
  assert.equal(record.checks[0]?.tasks[0]?.remarks, "Government ID already matched.");
  assert.equal(record.checks[0]?.tasks[0]?.fileUrl, "https://example.com/task-1.pdf");
  assert.equal(record.checks[1]?.tasks[0]?.label, "#2");
  assert.equal(record.checks[1]?.tasks[0]?.status, "Active Investigation");
  assert.equal(record.checks[1]?.tasks[0]?.fileUrl, null);
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
