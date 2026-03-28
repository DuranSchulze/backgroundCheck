type Status = "completed" | "in-progress" | "queued" | "pending";

interface BadgeProps {
  status: Status;
  label?: string;
  className?: string;
}

const statusConfig: Record<Status, { label: string; classes: string }> = {
  completed: {
    label: "Completed",
    classes: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  "in-progress": {
    label: "In Progress",
    classes: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  queued: {
    label: "Queued",
    classes: "bg-slate-100 text-slate-500 border border-slate-200",
  },
  pending: {
    label: "Pending",
    classes: "bg-slate-100 text-slate-500 border border-slate-200",
  },
};

export default function Badge({ status, label, className = "" }: BadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase",
        config.classes,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label ?? config.label}
    </span>
  );
}
