type ScoreRingProps = {
  value: number;
  label: string;
  size?: number;
  strokeWidth?: number;
};

const getStrokeColor = (value: number) => {
  if (value >= 80) return "#0f766e";
  if (value >= 65) return "#2563eb";
  if (value >= 50) return "#d97706";
  return "#dc2626";
};

export default function ScoreRing({
  value,
  label,
  size = 140,
  strokeWidth = 12,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI * 2;
  const dashOffset = circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getStrokeColor(value)}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-slate-900">{value}</span>
          <span className="text-xs uppercase tracking-[0.28em] text-slate-500">out of 100</span>
        </div>
      </div>

      <span className="text-sm font-semibold text-slate-600">{label}</span>
    </div>
  );
}
