import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import TrackingSearch from "@/components/tracking/TrackingSearch";
import CircularProgress from "@/components/tracking/CircularProgress";
import Badge from "@/components/ui/Badge";
import VerificationPipeline from "@/components/tracking/VerificationPipeline";
import RequestMetadata from "@/components/tracking/RequestMetadata";
import RecentActivity from "@/components/tracking/RecentActivity";
import type { PipelineStepData } from "@/components/tracking/VerificationPipeline";
import type { MetadataField } from "@/components/tracking/RequestMetadata";
import type { ActivityItem } from "@/components/tracking/RecentActivity";

export const metadata: Metadata = {
  title: "Verification Tracking | Editorial Logistics",
  description:
    "Track the real-time status of your background check processing.",
};

const pipelineSteps: PipelineStepData[] = [
  {
    id: "identity",
    title: "Identity Verification",
    description:
      "Biometric and passport documentation verified against global databases.",
    status: "completed",
  },
  {
    id: "criminal",
    title: "Criminal Record Check",
    description:
      "Multi-jurisdictional search conducted. No adverse findings reported.",
    status: "completed",
  },
  {
    id: "employment",
    title: "Employment History Verification",
    description:
      "Contacting previous employers to confirm tenure and seniority claims.",
    status: "in-progress",
  },
  {
    id: "education",
    title: "Education Verification",
    description:
      "Academic credential verification will begin following employment clearance.",
    status: "queued",
  },
];

const metadataFields: MetadataField[] = [
  { label: "Client Name", value: "Stark Industries Global" },
  { label: "Package", value: "Custom Choice" },
  { label: "Initiated", value: "October 12, 2023" },
  { label: "Case ID", value: "BL-BG-2023-7842" },
];

const activityItems: ActivityItem[] = [
  {
    id: "act1",
    time: "2:14",
    description: "Criminal check results returned. Passed to",
    highlight: "Stark Borys.",
  },
  {
    id: "act2",
    time: "9:01",
    description: "Automated profile confirmation sent to company.",
  },
  {
    id: "act3",
    time: "6:18",
    description: "Document signed and forwarded to review",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Page heading */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Verification Tracking
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Enter your reference number below to receive a real-time status
            update of your background check processing.
          </p>
        </div>

        {/* Search form */}
        <div className="mx-auto mb-10 max-w-xl">
          <TrackingSearch defaultValue="BG-741-VE9F" />
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column — progress + pipeline */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            {/* Status card */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                {/* Circular progress */}
                <CircularProgress percent={75} size={110} strokeWidth={9} />

                {/* Status info */}
                <div className="flex flex-col gap-1">
                  <Badge status="in-progress" />
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    In Progress
                  </h2>
                  <p className="text-sm text-slate-500">
                    Current stage: Employment History Verification
                  </p>
                </div>

                {/* Expected completion */}
                <div className="sm:ml-auto flex flex-col items-start sm:items-end gap-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Expected Completion
                  </span>
                  <span className="text-sm font-semibold text-slate-800">
                    Oct 24, 2023
                  </span>
                </div>
              </div>
            </div>

            {/* Verification pipeline */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="mb-5 text-xs font-bold uppercase tracking-widest text-slate-400">
                Verification Pipeline
              </h2>
              <VerificationPipeline steps={pipelineSteps} />
            </div>
          </div>

          {/* Right column — metadata + activity */}
          <div className="flex flex-col gap-6">
            <RequestMetadata fields={metadataFields} />
            <RecentActivity items={activityItems} />
          </div>
        </div>
      </main>
    </div>
  );
}
