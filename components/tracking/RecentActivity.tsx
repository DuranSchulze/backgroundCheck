export interface ActivityItem {
  id: string;
  time: string;
  description: string;
  highlight?: string;
}

interface RecentActivityProps {
  items: ActivityItem[];
}

export default function RecentActivity({ items }: RecentActivityProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
        Recent Activity
      </h3>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {item.time}
            </span>
            <p className="text-xs leading-relaxed text-slate-600">
              {item.description}{" "}
              {item.highlight && (
                <span className="font-semibold text-slate-900">
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
