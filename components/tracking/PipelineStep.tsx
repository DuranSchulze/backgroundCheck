import { ReactElement } from "react";
import Badge from "@/components/ui/badge";

type StepStatus = "completed" | "in-progress" | "queued";

interface PipelineStepProps {
  title: string;
  description: string;
  status: StepStatus;
  isLast?: boolean;
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
    <div className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
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
  completed: "bg-[#1f1a0d] text-white shadow-lg shadow-amber-100",
  "in-progress": "border-2 border-primary bg-white shadow-md shadow-amber-100",
  queued: "bg-surface-container-high text-outline",
};

const textColorByStatus: Record<StepStatus, string> = {
  completed: "text-on-surface",
  "in-progress": "text-primary",
  queued: "text-outline",
};

const descriptionColorByStatus: Record<StepStatus, string> = {
  completed: "text-on-surface-variant",
  "in-progress": "text-on-surface-variant",
  queued: "text-outline opacity-60",
};

export default function PipelineStep({
  title,
  description,
  status,
  isLast = false,
}: PipelineStepProps) {
  return (
    <div className="relative flex gap-5 pb-9 last:pb-0 md:gap-6 md:pb-10">
      {!isLast && (
        <div className="absolute left-4 top-8 bottom-0 w-[2px] bg-primary-fixed"></div>
      )}
      <div
        className={[
          "z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0",
          iconContainerByStatus[status],
        ].join(" ")}
      >
        {iconByStatus[status]}
      </div>
      <div className="flex-1">
        <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <h4
            className={[
              "font-headline text-base font-bold",
              textColorByStatus[status],
            ].join(" ")}
          >
            {title}
          </h4>
          <Badge
            status={
              status === "completed"
                ? "success"
                : status === "in-progress"
                  ? "processing"
                  : "queued"
            }
          />
        </div>
        <p
          className={[
            "text-sm leading-6",
            descriptionColorByStatus[status],
          ].join(" ")}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
