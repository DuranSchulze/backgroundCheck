import { ReactElement } from "react";
import Badge from "@/components/ui/Badge";

type StepStatus = "completed" | "in-progress" | "queued";

interface PipelineStepProps {
  title: string;
  description: string;
  status: StepStatus;
  stepNumber: number;
}

const iconByStatus: Record<StepStatus, ReactElement> = {
  completed: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd"
      />
    </svg>
  ),
  "in-progress": (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
    >
      <circle cx="10" cy="10" r="4" />
    </svg>
  ),
  queued: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
    >
      <circle cx="10" cy="10" r="3" />
    </svg>
  ),
};

const iconContainerByStatus: Record<StepStatus, string> = {
  completed: "bg-slate-900 text-white",
  "in-progress": "bg-amber-400 text-white",
  queued: "bg-slate-200 text-slate-400",
};

export default function PipelineStep({
  title,
  description,
  status,
}: PipelineStepProps) {
  return (
    <div className="flex items-start gap-4">
      <div
        className={[
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          iconContainerByStatus[status],
        ].join(" ")}
      >
        {iconByStatus[status]}
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-3">
          <span
            className={[
              "text-sm font-semibold",
              status === "queued" ? "text-slate-400" : "text-slate-800",
            ].join(" ")}
          >
            {title}
          </span>
          <Badge status={status} />
        </div>
        <p
          className={[
            "text-xs leading-relaxed",
            status === "queued" ? "text-slate-400" : "text-slate-500",
          ].join(" ")}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
