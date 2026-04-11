interface CircularProgressProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  progressColor?: string;
  sublabel?: string;
}

export default function CircularProgress({
  percent,
  size = 160,
  strokeWidth = 6,
  trackColor = "#e5e7eb",
  progressColor = "var(--color-on-surface)",
  sublabel,
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
      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-white/75 rotate-0">
        <span className="font-headline text-4xl font-extrabold leading-none text-on-surface">
          {percent}%
        </span>
        {sublabel && (
          <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
