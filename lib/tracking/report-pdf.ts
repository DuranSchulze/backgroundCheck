import type { TrackingRecord } from "@/lib/tracking/types";

type ReportLine = {
  text: string;
  style?: "title" | "heading" | "body" | "muted" | "progress";
  percent?: number;
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 54;
const MARGIN_TOP = 56;
const MARGIN_BOTTOM = 56;
const LINE_HEIGHT = 15;

function normalizeWhitespace(value: string) {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/₱/g, "PHP ")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapText(text: string, maxChars = 92) {
  const normalized = normalizeWhitespace(text);

  if (!normalized) {
    return [""];
  }

  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = "";
      }

      for (let index = 0; index < word.length; index += maxChars) {
        lines.push(word.slice(index, index + maxChars));
      }

      continue;
    }

    const next = current ? `${current} ${word}` : word;

    if (next.length <= maxChars) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function addWrappedLine(lines: ReportLine[], line: ReportLine) {
  const maxChars = line.style === "title" ? 54 : line.style === "heading" ? 70 : 92;

  wrapText(line.text, maxChars).forEach((text, index) => {
    lines.push({
      text,
      style: index === 0 ? line.style : "body",
    });
  });
}

function addSection(lines: ReportLine[], heading: string) {
  lines.push({ text: "", style: "body" });
  lines.push({ text: heading, style: "heading" });
}

function formatValue(value: string | null | undefined) {
  return value && value.trim() ? value : "-";
}

export function buildTrackingReportLines(record: TrackingRecord): ReportLine[] {
  const lines: ReportLine[] = [];

  addWrappedLine(lines, {
    text: "Filepino Background Check Status Report",
    style: "title",
  });
  addWrappedLine(lines, {
    text: `Tracking Number: ${record.referenceNumber}`,
    style: "body",
  });
  addWrappedLine(lines, {
    text: `Generated: ${new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })}`,
    style: "muted",
  });

  addSection(lines, "Summary");
  addWrappedLine(lines, { text: `Status: ${record.title}` });
  addWrappedLine(lines, { text: `Progress: ${record.percent}%` });
  lines.push({
    text: `${record.percent}% complete`,
    style: "progress",
    percent: record.percent,
  });
  addWrappedLine(lines, {
    text: `Expected Completion: ${record.expectedCompletion}`,
  });
  addWrappedLine(lines, { text: `Details: ${record.summary}` });

  addSection(lines, "Checks And Tasks");
  if (record.checks.length === 0) {
    addWrappedLine(lines, { text: "No check breakdown is available yet." });
  }

  record.checks.forEach((check, checkIndex) => {
    addWrappedLine(lines, {
      text: `${checkIndex + 1}. ${check.label} - ${check.overall}`,
      style: "heading",
    });
    addWrappedLine(lines, { text: `Remarks: ${formatValue(check.remarks)}` });

    if (check.fileUrl) {
      addWrappedLine(lines, { text: `File: ${check.fileUrl}` });
    }

    if (check.tasks.length === 0) {
      addWrappedLine(lines, { text: "Tasks: No tasks have been added." });
      return;
    }

    check.tasks.forEach((task) => {
      addWrappedLine(lines, {
        text: `- ${task.label} ${task.title} (${task.status})`,
      });
      addWrappedLine(lines, {
        text: `  Remarks: ${formatValue(task.remarks)}`,
        style: "muted",
      });

      if (task.fileUrl) {
        addWrappedLine(lines, {
          text: `  File: ${task.fileUrl}`,
          style: "muted",
        });
      }
    });
  });

  addSection(lines, "Verification Pipeline");
  record.pipelineSteps.forEach((step, index) => {
    addWrappedLine(lines, {
      text: `${index + 1}. ${step.title} - ${step.status.replace("-", " ")}`,
    });
    addWrappedLine(lines, {
      text: `   ${step.description}`,
      style: "muted",
    });
  });

  addSection(lines, "Request Metadata");
  record.metadataFields.forEach((field) => {
    addWrappedLine(lines, { text: `${field.label}: ${field.value}` });
  });

  addSection(lines, "Recent Activity");
  if (record.recentActivity.length === 0) {
    addWrappedLine(lines, { text: "No recent activity has been added yet." });
  }
  record.recentActivity.forEach((activity) => {
    addWrappedLine(lines, {
      text: `${activity.time}: ${activity.description}${
        activity.highlight ? ` (${activity.highlight})` : ""
      }`,
    });
  });

  return lines;
}

function escapePdfText(value: string) {
  return normalizeWhitespace(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function lineFontSize(style: ReportLine["style"]) {
  if (style === "title") return 18;
  if (style === "heading") return 12;
  if (style === "progress") return 9;
  return 10;
}

function lineLeading(style: ReportLine["style"]) {
  if (style === "title") return 24;
  if (style === "heading") return 18;
  if (style === "progress") return 28;
  return LINE_HEIGHT;
}

function clampPercent(percent: number | undefined) {
  if (typeof percent !== "number" || Number.isNaN(percent)) {
    return 0;
  }

  return Math.min(100, Math.max(0, percent));
}

function buildTextCommands(params: {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
}) {
  return [
    params.color,
    "BT",
    `/F1 ${params.fontSize} Tf`,
    `1 0 0 1 ${params.x} ${params.y} Tm`,
    `(${escapePdfText(params.text)}) Tj`,
    "ET",
  ];
}

function buildProgressCommands(line: ReportLine, y: number) {
  const trackWidth = 330;
  const trackHeight = 9;
  const trackX = MARGIN_X;
  const trackY = y + 8;
  const percent = clampPercent(line.percent);
  const fillWidth = (trackWidth * percent) / 100;

  return [
    "q",
    "0.90 0.92 0.95 rg",
    `${trackX} ${trackY} ${trackWidth} ${trackHeight} re f`,
    "0.07 0.09 0.13 rg",
    `${trackX} ${trackY} ${fillWidth.toFixed(2)} ${trackHeight} re f`,
    "Q",
    ...buildTextCommands({
      text: line.text,
      x: trackX + trackWidth + 14,
      y: trackY + 1,
      fontSize: lineFontSize(line.style),
      color: "0.17 0.20 0.25 rg",
    }),
  ];
}

function buildContentStream(lines: ReportLine[], pageNumber: number) {
  const commands: string[] = [];
  let y = PAGE_HEIGHT - MARGIN_TOP;

  for (const line of lines) {
    const leading = lineLeading(line.style);
    const fontSize = lineFontSize(line.style);
    y -= leading;

    if (line.style === "progress") {
      commands.push(...buildProgressCommands(line, y));
      continue;
    }

    const color =
      line.style === "muted"
        ? "0.35 0.39 0.45 rg"
        : line.style === "title" || line.style === "heading"
          ? "0.07 0.09 0.13 rg"
          : "0.17 0.20 0.25 rg";

    commands.push(
      ...buildTextCommands({
        text: line.text,
        x: MARGIN_X,
        y,
        fontSize,
        color,
      }),
    );
  }

  commands.push(
    ...buildTextCommands({
      text: `Page ${pageNumber}`,
      x: MARGIN_X,
      y: 34,
      fontSize: 8,
      color: "0.45 0.50 0.56 rg",
    }),
  );

  return commands.join("\n");
}

function paginateLines(lines: ReportLine[]) {
  const pages: ReportLine[][] = [];
  let page: ReportLine[] = [];
  let usedHeight = 0;
  const usableHeight = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

  for (const line of lines) {
    const leading = lineLeading(line.style);

    if (page.length > 0 && usedHeight + leading > usableHeight) {
      pages.push(page);
      page = [];
      usedHeight = 0;
    }

    page.push(line);
    usedHeight += leading;
  }

  if (page.length > 0) {
    pages.push(page);
  }

  return pages;
}

function concatParts(parts: Uint8Array[]) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}

export function createTrackingReportPdf(record: TrackingRecord) {
  const encoder = new TextEncoder();
  const pages = paginateLines(buildTrackingReportLines(record));
  const objectCount = 3 + pages.length * 2;
  const objects: string[] = [];
  const pageObjectIds = pages.map((_, index) => 4 + index * 2);

  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] =
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[2] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  pages.forEach((pageLines, index) => {
    const pageObjectId = pageObjectIds[index];
    const contentObjectId = pageObjectId + 1;
    const stream = buildContentStream(pageLines, index + 1);

    objects[pageObjectId - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
    objects[contentObjectId - 1] =
      `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`;
  });

  const parts: Uint8Array[] = [encoder.encode("%PDF-1.7\n")];
  const offsets = [0];

  for (let index = 0; index < objectCount; index += 1) {
    offsets.push(parts.reduce((sum, part) => sum + part.length, 0));
    parts.push(encoder.encode(`${index + 1} 0 obj\n${objects[index]}\nendobj\n`));
  }

  const startXref = parts.reduce((sum, part) => sum + part.length, 0);
  const xref = [
    "xref",
    `0 ${objectCount + 1}`,
    "0000000000 65535 f ",
    ...offsets
      .slice(1)
      .map((offset) => `${offset.toString().padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objectCount + 1} /Root 1 0 R >>`,
    "startxref",
    String(startXref),
    "%%EOF",
  ].join("\n");

  parts.push(encoder.encode(xref));

  return concatParts(parts);
}

export function getTrackingReportFileName(referenceNumber: string) {
  const safeReference = referenceNumber.replace(/[^a-z0-9-]+/gi, "-");
  return `${safeReference || "tracking"}-status-report.pdf`;
}
