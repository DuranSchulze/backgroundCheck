interface CircularProgressProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  progressColor?: string;
  label?: string;
}

export default function CircularProgress({
  percent,
  size = 100,
  strokeWidth = 8,
  trackColor = "#e2e8f0",
  progressColor = "#f59e0b",
  label,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span className="absolute flex flex-col items-center justify-center rotate-0">
        <span className="text-xl font-bold text-slate-900 leading-none">
          {percent}%
        </span>
        {label && (
          <span className="mt-0.5 text-[10px] font-medium text-slate-500">
            {label}
          </span>
        )}
      </span>
    </div>
  );
}
