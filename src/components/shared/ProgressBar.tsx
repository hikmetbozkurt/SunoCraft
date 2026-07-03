interface ProgressBarProps {
  progress: number;       // 0-100
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const heightMap = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export function ProgressBar({
  progress,
  label,
  showPercentage = true,
  size = 'md',
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="w-full space-y-1.5">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="text-zinc-400">{label}</span>}
          {showPercentage && (
            <span className="text-violet-400 font-mono font-semibold tabular-nums">
              %{clampedProgress.toFixed(0)}
            </span>
          )}
        </div>
      )}
      <div
        className={`
          w-full rounded-full overflow-hidden
          bg-white/5 backdrop-blur-sm
          ${heightMap[size]}
        `}
      >
        <div
          className={`
            ${heightMap[size]} rounded-full
            bg-gradient-to-r from-violet-600 via-purple-500 to-cyan-400
            transition-all duration-500 ease-out
            relative overflow-hidden
          `}
          style={{ width: `${clampedProgress}%` }}
        >
          {/* Shimmer effect */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
          />
        </div>
      </div>
    </div>
  );
}
