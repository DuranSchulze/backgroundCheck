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
    <div className="rounded-[1.75rem] border border-amber-200 bg-white p-8 sm:p-10">
      <div className="flex flex-col items-center text-center">
        <div className="mb-8">
          <CircularProgress percent={percent} sublabel="Completed" />
        </div>

        <div className="space-y-2">
          <Badge status={status} variant="dot" />
          <h2 className="text-3xl font-headline font-bold text-on-surface">
            {title}
          </h2>
          <p className="text-on-surface-variant font-medium">
            Expected Completion:{" "}
            <span className="font-bold text-primary">{expectedCompletion}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
