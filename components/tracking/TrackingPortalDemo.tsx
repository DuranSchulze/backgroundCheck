"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import {
  Activity,
  AlertCircle,
  ClipboardList,
  Download,
  FileSearch,
  Fingerprint,
  ShieldCheck,
  X,
} from "lucide-react";
import CheckBreakdown from "@/components/tracking/CheckBreakdown";
import RecentActivity from "@/components/tracking/RecentActivity";
import RequestMetadata from "@/components/tracking/RequestMetadata";
import StatusCard from "@/components/tracking/StatusCard";
import TrackingSearch from "@/components/tracking/TrackingSearch";
import VerificationPipeline from "@/components/tracking/VerificationPipeline";
import { normalizeReferenceNumber } from "@/lib/tracking/normalize";
import {
  createTrackingReportPdf,
  getTrackingReportFileName,
} from "@/lib/tracking/report-pdf";
import type { TrackingRecord } from "@/lib/tracking/types";

const easeOut = [0.22, 1, 0.36, 1] as const;

type TrackingResponse = {
  record?: TrackingRecord;
  error?: string;
};

export default function TrackingPortalDemo() {
  const [lastSearch, setLastSearch] = useState("");
  const [record, setRecord] = useState<TrackingRecord | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsResultsOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  async function handleSearch(referenceNumber: string) {
    const normalizedReference = normalizeReferenceNumber(referenceNumber);

    setLastSearch(normalizedReference);
    setLookupError(null);
    setRecord(null);
    setIsLookupLoading(true);
    setIsResultsOpen(true);

    try {
      const response = await fetch(
        `/api/tracking?referenceNumber=${encodeURIComponent(normalizedReference)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as TrackingResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Unable to fetch tracking details.");
      }

      setRecord(payload.record ?? null);
    } catch (error) {
      setLookupError(
        error instanceof Error
          ? error.message
          : "Unable to fetch tracking details.",
      );
    } finally {
      setIsLookupLoading(false);
    }
  }

  function handleDownloadReport() {
    if (!record) {
      return;
    }

    const pdfBytes = createTrackingReportPdf(record);
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = getTrackingReportFileName(record.referenceNumber);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <LazyMotion features={domAnimation}>
      <>
        <TrackingSearch
          key={lastSearch}
          initialValue={lastSearch}
          onSearch={handleSearch}
        />

        <AnimatePresence>
          {isResultsOpen && (
            <m.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6 lg:p-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <button
                type="button"
                className="absolute inset-0 cursor-default"
                onClick={() => setIsResultsOpen(false)}
                aria-label="Close tracking details"
              />

              <m.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="tracking-results-title"
                className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-white shadow-lg sm:max-h-[calc(100dvh-3rem)]"
                initial={{ opacity: 0, y: 26, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.985 }}
                transition={{ duration: 0.32, ease: easeOut }}
              >
                <div className="border-b border-outline-variant/30 bg-white px-5 py-4 sm:px-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-2 rounded-md border border-outline-variant/40 bg-surface-container-low px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                        <ShieldCheck className="h-3.5 w-3.5 text-on-surface" />
                        Background Checking
                      </div>
                      <h2
                        id="tracking-results-title"
                        className="mt-3 font-headline text-xl font-bold text-on-surface sm:text-2xl"
                      >
                        {isLookupLoading
                          ? "Fetching Tracking Details"
                          : record
                            ? "Tracking Details"
                            : "Reference Not Found"}
                      </h2>
                      <p className="mt-2 flex items-center gap-2 text-sm text-on-surface-variant">
                        <Fingerprint className="h-4 w-4 text-outline" />
                        {lastSearch
                          ? `Lookup for ${lastSearch}`
                          : "Enter a reference number to view the case details."}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {record && !isLookupLoading ? (
                        <button
                          type="button"
                          onClick={handleDownloadReport}
                          className="inline-flex h-9 items-center gap-2 rounded-md border border-outline-variant/40 bg-white px-3 text-xs font-bold uppercase tracking-[0.14em] text-on-surface transition-colors hover:bg-surface-container-low"
                        >
                          <Download className="h-4 w-4" />
                          <span className="hidden sm:inline">Export Report</span>
                          <span className="sm:hidden">PDF</span>
                        </button>
                      ) : null}

                      <m.button
                        type="button"
                        onClick={() => setIsResultsOpen(false)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-outline-variant/40 bg-white text-on-surface transition-colors hover:bg-surface-container-low"
                        aria-label="Close tracking details"
                        whileHover={{ rotate: 90 }}
                        transition={{ duration: 0.2 }}
                      >
                        <X className="h-5 w-5" />
                      </m.button>
                    </div>
                  </div>
                </div>

                <div className="overflow-y-auto px-5 py-5 sm:px-6">
                  {isLookupLoading ? (
                    <m.div
                      className="rounded-lg border border-outline-variant/30 bg-white p-10 text-center"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.24, ease: easeOut }}
                    >
                      <m.div
                        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-outline-variant/30 bg-surface-container-low text-on-surface"
                        animate={{ rotate: 360 }}
                        transition={{
                          repeat: Number.POSITIVE_INFINITY,
                          duration: 1.4,
                          ease: "linear",
                        }}
                      >
                        <FileSearch className="h-6 w-6" />
                      </m.div>
                      <h2 className="mb-2 font-headline text-xl font-bold text-on-surface">
                        Looking up your reference number
                      </h2>
                      <p className="mx-auto max-w-lg text-sm leading-6 text-on-surface-variant">
                        We&apos;re fetching the tracking details from the
                        backend source so the modal can display the latest case
                        data.
                      </p>
                    </m.div>
                  ) : record ? (
                    <div className="space-y-0 divide-y divide-outline-variant/20">
                      <div className="">
                        <m.div
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.28,
                            delay: 0.06,
                            ease: easeOut,
                          }}
                          className="pb-5"
                        >
                          <StatusCard
                            percent={record.percent}
                            status={record.status}
                            title={record.title}
                            expectedCompletion={record.expectedCompletion}
                          />
                        </m.div>

                        <m.div
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.28,
                            delay: 0.12,
                            ease: easeOut,
                          }}
                          className="py-5"
                        >
                          <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                            <FileSearch className="h-3.5 w-3.5 text-on-surface" />
                            Case Summary
                          </div>
                          <p className="text-sm leading-7 text-on-surface-variant">
                            <m.span
                              className="mr-2 inline-flex rounded-md border border-outline-variant/30 bg-surface-container-low px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-outline"
                              initial={{ opacity: 0, scale: 0.96 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.24, delay: 0.18 }}
                            >
                              {record.referenceNumber}
                            </m.span>
                            {record.summary}
                          </p>
                        </m.div>

                        <m.div
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.28,
                            delay: 0.18,
                            ease: easeOut,
                          }}
                          className="py-5"
                        >
                          <CheckBreakdown checks={record.checks ?? []} />
                        </m.div>

                        <m.div
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.28,
                            delay: 0.24,
                            ease: easeOut,
                          }}
                          className="py-5"
                        >
                          <div className="mb-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                            <ShieldCheck className="h-3.5 w-3.5 text-on-surface" />
                            Verification Pipeline
                          </div>
                          <VerificationPipeline steps={record.pipelineSteps} />
                        </m.div>
                      </div>

                      <div className="">
                        <m.div
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.28,
                            delay: 0.3,
                            ease: easeOut,
                          }}
                          className="py-5"
                        >
                          <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                            <ClipboardList className="h-3.5 w-3.5 text-on-surface" />
                            Request Metadata
                          </div>
                          <RequestMetadata fields={record.metadataFields} />
                        </m.div>

                        <m.div
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.28,
                            delay: 0.36,
                            ease: easeOut,
                          }}
                          className="py-5"
                        >
                          <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                            <Activity className="h-3.5 w-3.5 text-on-surface" />
                            Recent Activity
                          </div>
                          <RecentActivity items={record.recentActivity} />
                        </m.div>
                      </div>
                    </div>
                  ) : (
                    <m.div
                      className="rounded-lg bg-white p-10 text-center"
                      initial={{ opacity: 0, y: 22, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 12 }}
                      transition={{ duration: 0.3, ease: easeOut }}
                    >
                      <m.div
                        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-outline-variant/30 bg-surface-container-low text-on-surface"
                        initial={{ scale: 0.92, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3, ease: easeOut }}
                      >
                        {lookupError ? (
                          <AlertCircle className="h-6 w-6" />
                        ) : (
                          <FileSearch className="h-6 w-6" />
                        )}
                      </m.div>
                      <h2 className="mb-2 font-headline text-xl font-bold text-on-surface">
                        {lookupError
                          ? "Unable to fetch tracking details"
                          : "Reference number not found"}
                      </h2>
                      <p className="mx-auto max-w-lg text-sm leading-6 text-on-surface-variant">
                        {lookupError ? (
                          lookupError
                        ) : (
                          <>
                            No sample record matches{" "}
                            <span className="font-bold text-on-surface">
                              {lastSearch}
                            </span>
                            . Please check the order number and try again.
                          </>
                        )}
                      </p>
                    </m.div>
                  )}
                </div>
              </m.div>
            </m.div>
          )}
        </AnimatePresence>
      </>
    </LazyMotion>
  );
}
