type Status =
  | "completed"
  | "in-progress"
  | "queued"
  | "pending"
  | "active-investigation"
  | "processing"
  | "success";

interface BadgeProps {
  status: Status;
  label?: string;
  className?: string;
  variant?: "default" | "subtle" | "dot";
}

const statusConfig: Record<
  Status,
  { label: string; classes: string; dotColor?: string }
> = {
  completed: {
    label: "Completed",
    classes: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    dotColor: "bg-emerald-600",
  },
  "in-progress": {
    label: "In Progress",
    classes: "border border-slate-300 bg-slate-900 text-white",
    dotColor: "bg-white",
  },
  "active-investigation": {
    label: "Active Investigation",
    classes: "border border-slate-300 bg-slate-100 text-slate-700",
    dotColor: "bg-slate-600",
  },
  processing: {
    label: "Processing",
    classes: "border border-slate-200 bg-white px-2 py-0.5 text-slate-700",
    dotColor: "bg-slate-700",
  },
  success: {
    label: "Success",
    classes: "text-[10px] font-bold uppercase text-emerald-700",
    dotColor: "bg-emerald-600",
  },
  queued: {
    label: "Queued",
    classes:
      "bg-surface-container-high text-outline text-[10px] font-bold uppercase tracking-wider",
    dotColor: "bg-outline",
  },
  pending: {
    label: "Pending",
    classes:
      "bg-surface-container-high text-outline border border-outline-variant",
    dotColor: "bg-outline",
  },
};

export default function Badge({
  status,
  label,
  className = "",
  variant = "default",
}: BadgeProps) {
  const config = statusConfig[status];

  if (variant === "dot") {
    return (
      <span className="inline-flex items-center gap-1.5 border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-700">
        <span
          className={["w-1.5 h-1.5 rounded-full animate-pulse", config.dotColor]
            .filter(Boolean)
            .join(" ")}
        ></span>
        {label ?? config.label}
      </span>
    );
  }

  return (
    <span
      className={[
        "inline-flex items-center px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase",
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
