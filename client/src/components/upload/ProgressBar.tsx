interface ProgressBarProps {
  value: number; // 0–100
  className?: string;
}

export function ProgressBar({ value, className }: ProgressBarProps) {
  return (
    <div className={`w-full bg-base-300 rounded-full h-1.5 overflow-hidden ${className ?? ''}`}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${value}%`,
          background: 'linear-gradient(90deg, #FF6B6B, #FF8E53, #FFAD3B)',
        }}
      />
    </div>
  );
}
