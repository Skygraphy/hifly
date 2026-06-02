import type { ProcessingStatus } from '../../api/images';

const CONFIG: Record<ProcessingStatus, { label: string; className: string; dot: string }> = {
  pending:    { label: 'Wartend',       className: 'bg-base-300 text-base-content/60', dot: 'bg-base-content/40' },
  processing: { label: 'Verarbeitung', className: 'bg-warning/10 text-warning',         dot: 'bg-warning animate-ping' },
  ready:      { label: 'Bereit',        className: 'bg-success/10 text-success',         dot: 'bg-success' },
  error:      { label: 'Fehler',        className: 'bg-error/10 text-error',             dot: 'bg-error' },
};

interface StatusBadgeProps {
  status: ProcessingStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const cfg = CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className} ${className ?? ''}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
