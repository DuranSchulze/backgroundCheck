import type { ActivityItem } from "@/lib/tracking/types";

interface RecentActivityProps {
  items: ActivityItem[];
}

export default function RecentActivity({ items }: RecentActivityProps) {
  return (
    <div className="rounded-[1.75rem] border border-amber-200 bg-white p-6">
      <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-outline">
        Recent Activity
      </h3>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-outline">
              {item.time}
            </span>
            <p className="text-xs leading-relaxed text-on-surface-variant">
              {item.description}{" "}
              {item.highlight && (
                <span className="font-semibold text-on-surface">
                  {item.highlight}
                </span>
              )}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
