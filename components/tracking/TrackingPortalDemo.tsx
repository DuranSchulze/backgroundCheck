"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import {
  Activity,
  AlertCircle,
  ClipboardList,
  Copy,
  FileSearch,
  Fingerprint,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import RecentActivity from "@/components/tracking/RecentActivity";
import RequestMetadata from "@/components/tracking/RequestMetadata";
import StatusCard from "@/components/tracking/StatusCard";
import TrackingSearch from "@/components/tracking/TrackingSearch";
import VerificationPipeline from "@/components/tracking/VerificationPipeline";
import { normalizeReferenceNumber } from "@/lib/tracking/normalize";
import type { TrackingRecord, TrackingSample } from "@/lib/tracking/types";

const easeOut = [0.22, 1, 0.36, 1] as const;

type SamplesResponse = {
  samples?: TrackingSample[];
  error?: string;
};

type TrackingResponse = {
  record?: TrackingRecord;
  error?: string;
};

export default function TrackingPortalDemo() {
  const [lastSearch, setLastSearch] = useState("");
  const [record, setRecord] = useState<TrackingRecord | null>(null);
  const [samples, setSamples] = useState<TrackingSample[]>([]);
  const [copiedReference, setCopiedReference] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [isSamplesLoading, setIsSamplesLoading] = useState(true);
  const [isSamplesOpen, setIsSamplesOpen] = useState(false);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsResultsOpen(false);
        setIsSamplesOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSamples() {
      try {
        const response = await fetch("/api/tracking/samples", {
          cache: "no-store",
        });
        const payload = (await response.json()) as SamplesResponse;

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load sample references.");
        }

        if (!cancelled) {
          setSamples(payload.samples ?? []);
        }
      } catch {
        if (!cancelled) {
          setSamples([]);
        }
      } finally {
        if (!cancelled) {
          setIsSamplesLoading(false);
        }
      }
    }

    loadSamples();

    return () => {
      cancelled = true;
    };
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

  async function handleCopyReference(referenceNumber: string) {
    try {
      await navigator.clipboard.writeText(referenceNumber);
      setCopiedReference(referenceNumber);

      window.setTimeout(() => {
        setCopiedReference((current) =>
          current === referenceNumber ? null : current,
        );
      }, 1800);
    } catch {
      setCopiedReference(null);
    }
  }

  return (
    <LazyMotion features={domAnimation}>
      <>
        <m.section
          className="w-full max-w-2xl"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.18, ease: easeOut }}
        >
          <TrackingSearch
            key={lastSearch}
            initialValue={lastSearch}
            onSearch={handleSearch}
          />
        </m.section>

        <div className="fixed bottom-6 right-6 z-20 flex flex-col items-end gap-3">
          <AnimatePresence>
            {isSamplesOpen && (
              <m.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.24, ease: easeOut }}
                className="w-[min(24rem,calc(100vw-2rem))] rounded-[1.5rem] border border-amber-200 bg-white p-5"
              >
                <div className="mb-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-outline">
                    Sample References
                  </p>
                  <h3 className="mt-2 flex items-center gap-2 font-headline text-xl font-bold text-on-surface">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Copy a demo case
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
                    Copy one of these sample numbers, paste it into the tracking
                    field above, and submit to simulate a real lookup flow.
                  </p>
                </div>

                <div className="space-y-3">
                  {isSamplesLoading ? (
                    <div className="rounded-[1.25rem] border border-amber-200 bg-white p-4 text-sm text-on-surface-variant">
                      Loading sample references...
                    </div>
                  ) : samples.length > 0 ? (
                    samples.map((sample, index) => (
                      <m.div
                        key={sample.referenceNumber}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.22,
                          delay: 0.04 * index,
                          ease: easeOut,
                        }}
                        className="rounded-[1.25rem] border border-amber-200 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-headline font-bold text-on-surface">
                              {sample.title}
                            </p>
                            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                              {sample.referenceNumber}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyReference(sample.referenceNumber)
                            }
                            className="rounded-full border border-[#f0ca52] bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--color-on-primary)] transition-colors hover:bg-primary-container"
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <Copy className="h-3.5 w-3.5" />
                              {copiedReference === sample.referenceNumber
                                ? "Copied"
                                : "Copy"}
                            </span>
                          </button>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
                          {sample.summary}
                        </p>
                      </m.div>
                    ))
                  ) : (
                    <div className="rounded-[1.25rem] border border-amber-200 bg-white p-4 text-sm text-on-surface-variant">
                      No sample references are available from the current
                      backend source.
                    </div>
                  )}
                </div>
              </m.div>
            )}
          </AnimatePresence>

          <m.button
            type="button"
            onClick={() => setIsSamplesOpen((current) => !current)}
            className="rounded-full border border-[#f0ca52] bg-primary px-5 py-3 font-headline text-sm font-bold uppercase tracking-[0.2em] text-[color:var(--color-on-primary)] transition-colors hover:bg-primary-container"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.26, ease: easeOut }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="inline-flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              {isSamplesOpen ? "Close Samples" : "Sample References"}
            </span>
          </m.button>
        </div>

        <AnimatePresence>
          {isResultsOpen && (
            <m.div
              className="fixed inset-0 z-30 flex items-center justify-center bg-[rgba(35,27,8,0.24)] p-4 sm:p-6 lg:p-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div
                className="absolute inset-0"
                onClick={() => setIsResultsOpen(false)}
              />

              <m.div
                className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[1.75rem] border border-amber-200 bg-white sm:max-h-[calc(100dvh-3rem)]"
                initial={{ opacity: 0, y: 26, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.985 }}
                transition={{ duration: 0.32, ease: easeOut }}
              >
                <div className="border-b border-amber-200 bg-white px-5 py-5 sm:px-8">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-outline">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        Background Checking
                      </div>
                      <h2 className="mt-3 font-headline text-2xl font-bold text-on-surface sm:text-3xl">
                        {isLookupLoading
                          ? "Fetching Tracking Details"
                          : record
                            ? "Tracking Details"
                            : "Reference Not Found"}
                      </h2>
                      <p className="mt-2 flex items-center gap-2 text-sm text-on-surface-variant">
                        <Fingerprint className="h-4 w-4 text-primary" />
                        {lastSearch
                          ? `Lookup for ${lastSearch}`
                          : "Enter a reference number to view the case details."}
                      </p>
                    </div>

                    <m.button
                      type="button"
                      onClick={() => setIsResultsOpen(false)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-amber-200 bg-white text-on-surface transition-colors hover:bg-primary-fixed"
                      aria-label="Close tracking details"
                      whileHover={{ rotate: 90 }}
                      transition={{ duration: 0.2 }}
                    >
                      <X className="h-5 w-5" />
                    </m.button>
                  </div>
                </div>

                <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
                  {isLookupLoading ? (
                    <m.div
                      className="rounded-[1.75rem] border border-amber-200 bg-white p-10 text-center"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.24, ease: easeOut }}
                    >
                      <m.div
                        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-fixed text-primary"
                        animate={{ rotate: 360 }}
                        transition={{
                          repeat: Number.POSITIVE_INFINITY,
                          duration: 1.4,
                          ease: "linear",
                        }}
                      >
                        <FileSearch className="h-6 w-6" />
                      </m.div>
                      <h2 className="mb-2 font-headline text-2xl font-bold text-on-surface">
                        Looking up your reference number
                      </h2>
                      <p className="mx-auto max-w-lg text-sm leading-relaxed text-on-surface-variant">
                        We&apos;re fetching the tracking details from the backend
                        source so the modal can display the latest case data.
                      </p>
                    </m.div>
                  ) : record ? (
                    <m.div
                      className="space-y-6"
                      initial="hidden"
                      animate="visible"
                      variants={{
                        hidden: {},
                        visible: {
                          transition: {
                            staggerChildren: 0.06,
                            delayChildren: 0.06,
                          },
                        },
                      }}
                    >
                      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                        <div className="space-y-6">
                          <m.div
                            variants={{
                              hidden: { opacity: 0, y: 18 },
                              visible: { opacity: 1, y: 0 },
                            }}
                            transition={{ duration: 0.28, ease: easeOut }}
                          >
                            <StatusCard
                              percent={record.percent}
                              status={record.status}
                              title={record.title}
                              expectedCompletion={record.expectedCompletion}
                            />
                          </m.div>

                          <m.div
                            variants={{
                              hidden: { opacity: 0, y: 18 },
                              visible: { opacity: 1, y: 0 },
                            }}
                            transition={{ duration: 0.28, ease: easeOut }}
                            className="rounded-[1.75rem] border border-amber-200 bg-white p-6"
                          >
                            <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-outline">
                              <FileSearch className="h-4 w-4 text-primary" />
                              Case Summary
                            </div>
                            <p className="text-sm leading-7 text-on-surface-variant">
                              <m.span
                                className="mr-2 inline-flex rounded-full bg-primary-fixed px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--color-on-primary-fixed)]"
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
                            variants={{
                              hidden: { opacity: 0, y: 18 },
                              visible: { opacity: 1, y: 0 },
                            }}
                            transition={{ duration: 0.28, ease: easeOut }}
                            className="rounded-[1.75rem] border border-amber-200 bg-white p-6 sm:p-8"
                          >
                            <div className="mb-8 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-outline">
                              <ShieldCheck className="h-4 w-4 text-primary" />
                              Verification Pipeline
                            </div>
                            <VerificationPipeline steps={record.pipelineSteps} />
                          </m.div>
                        </div>

                        <div className="space-y-6">
                          <m.div
                            variants={{
                              hidden: { opacity: 0, y: 18 },
                              visible: { opacity: 1, y: 0 },
                            }}
                            transition={{ duration: 0.28, ease: easeOut }}
                            className="rounded-[1.75rem] border border-amber-200 bg-white p-5"
                          >
                            <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-outline">
                              <ClipboardList className="h-4 w-4 text-primary" />
                              Request Metadata
                            </div>
                            <RequestMetadata fields={record.metadataFields} />
                          </m.div>

                          <m.div
                            variants={{
                              hidden: { opacity: 0, y: 18 },
                              visible: { opacity: 1, y: 0 },
                            }}
                            transition={{ duration: 0.28, ease: easeOut }}
                            className="rounded-[1.75rem] border border-amber-200 bg-white p-5"
                          >
                            <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-outline">
                              <Activity className="h-4 w-4 text-primary" />
                              Recent Activity
                            </div>
                            <RecentActivity items={record.recentActivity} />
                          </m.div>
                        </div>
                      </div>
                    </m.div>
                  ) : (
                    <m.div
                      className="rounded-[1.75rem] border border-amber-200 bg-white p-10 text-center"
                      initial={{ opacity: 0, y: 22, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 12 }}
                      transition={{ duration: 0.3, ease: easeOut }}
                    >
                      <m.div
                        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-fixed text-primary"
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
                      <h2 className="mb-2 font-headline text-2xl font-bold text-on-surface">
                        {lookupError
                          ? "Unable to fetch tracking details"
                          : "Reference number not found"}
                      </h2>
                      <p className="mx-auto max-w-lg text-sm leading-relaxed text-on-surface-variant">
                        {lookupError ? (
                          lookupError
                        ) : (
                          <>
                            No sample record matches{" "}
                            <span className="font-bold text-on-surface">
                              {lastSearch}
                            </span>
                            . Open the sample references helper to copy a demo
                            tracking number, then paste it into the field and
                            submit to preview the modal tracking experience.
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
