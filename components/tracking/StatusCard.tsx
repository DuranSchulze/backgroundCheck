import CircularProgress from "@/components/tracking/CircularProgress";
import Badge from "@/components/ui/badge";

interface StatusCardProps {
  percent: number;
  status: "active-investigation" | "in-progress" | "completed" | "queued";
  title: string;
  expectedCompletion: string;
}

export default function StatusCard({
  percent,
  status,
  title,
  expectedCompletion,
}: StatusCardProps) {
  return (
    <div className="rounded-lg border border-outline-variant/30 bg-white p-5 sm:p-6">
      <div className="flex flex-col items-center text-center">
        <div className="mb-6">
          <CircularProgress percent={percent} sublabel="Completed" />
        </div>

        <div className="space-y-2">
          <Badge status={status} variant="dot" />
          <h2 className="text-2xl font-headline font-bold text-on-surface md:text-[1.75rem]">
            {title}
          </h2>
          <p className="text-sm leading-6 text-on-surface-variant font-medium">
            Expected Completion:{" "}
            <span className="font-bold text-on-surface">{expectedCompletion}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
