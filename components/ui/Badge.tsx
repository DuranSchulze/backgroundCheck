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
    classes:
      "border border-[#e8d28c] bg-[#fff7da] text-[color:var(--color-on-primary-fixed)]",
    dotColor: "bg-primary",
  },
  "in-progress": {
    label: "In Progress",
    classes:
      "border border-[#f0ca52] bg-primary text-[color:var(--color-on-primary)]",
    dotColor: "bg-[color:var(--color-on-primary)]",
  },
  "active-investigation": {
    label: "Active Investigation",
    classes: "border border-[#eec07c] bg-[#fff0cf] text-[#8a5207]",
    dotColor: "bg-[#b96b12]",
  },
  processing: {
    label: "Processing",
    classes:
      "bg-primary-fixed px-2 py-0.5 text-[color:var(--color-on-primary-fixed)]",
    dotColor: "bg-primary",
  },
  success: {
    label: "Success",
    classes: "text-[10px] font-bold uppercase text-[#8a6a00]",
    dotColor: "bg-primary",
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
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-fixed-dim bg-primary-fixed px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[color:var(--color-on-primary-fixed)]">
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
