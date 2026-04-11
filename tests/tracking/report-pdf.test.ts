import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTrackingReportLines,
  createTrackingReportPdf,
  getTrackingReportFileName,
} from "@/lib/tracking/report-pdf";
import type { TrackingRecord } from "@/lib/tracking/types";

const record: TrackingRecord = {
  referenceNumber: "ORD-123",
  status: "in-progress",
  title: "Background Check In Progress",
  expectedCompletion: "Apr 20, 2026",
  percent: 50,
  summary: "Employer verification is underway.",
  metadataFields: [
    { label: "Subject Name", value: "Maria Santos" },
    { label: "Purpose", value: "Employment" },
  ],
  pipelineSteps: [
    {
      id: "step-1",
      title: "Identity Review",
      description: "Reviewing identity documents.",
      status: "in-progress",
    },
  ],
  checks: [
    {
      id: "check-1",
      label: "Identity Checks",
      overall: "In Progress",
      remarks: "Government ID review started.",
      fileUrl: "https://drive.google.com/check-file",
      tasks: [
        {
          id: "task-1",
          label: "#1",
          title: "Review submitted ID",
          status: "In Progress",
          remarks: "ID photo is readable.",
          fileUrl: "https://example.com/task-file.pdf",
        },
      ],
    },
    {
      id: "check-2",
      label: "Reference Checks",
      overall: "Queued",
      remarks: null,
      fileUrl: null,
      tasks: [],
    },
  ],
  recentActivity: [
    {
      id: "activity-1",
      time: "Today",
      description: "Case was updated.",
      highlight: "Admin",
    },
  ],
};

test("buildTrackingReportLines includes linked check and task files", () => {
  const text = buildTrackingReportLines(record)
    .map((line) => line.text)
    .join("\n");

  assert.match(text, /Filepino Background Check Status Report/);
  assert.match(text, /Tracking Number: ORD-123/);
  assert.match(text, /File: https:\/\/drive\.google\.com\/check-file/);
  assert.match(text, /File: https:\/\/example\.com\/task-file\.pdf/);
  assert.doesNotMatch(text, /Reference Checks[\s\S]*File: null/);
});

test("createTrackingReportPdf returns a valid PDF payload", () => {
  const pdf = createTrackingReportPdf(record);
  const text = new TextDecoder().decode(pdf);

  assert.equal(text.slice(0, 8), "%PDF-1.7");
  assert.match(text.slice(-80), /%%EOF/);
  assert.match(text, /Filepino Background Check Status Report/);
  assert.match(text, /Tracking Number: ORD-123/);
  assert.match(text, /50% complete/);
  assert.match(text, /https:\/\/drive\.google\.com\/check-file/);
  assert.match(text, /330 9 re f/);
  assert.match(text, /165\.00 9 re f/);
  assert.ok(pdf.length > 1000);
});

test("getTrackingReportFileName creates a safe PDF file name", () => {
  assert.equal(
    getTrackingReportFileName("ORD 123/ABC"),
    "ORD-123-ABC-status-report.pdf",
  );
});
