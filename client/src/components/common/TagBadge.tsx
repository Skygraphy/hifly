interface TagBadgeProps {
  tag: string;
  onRemove?: () => void;
  onClick?: () => void;
  active?: boolean;
}

export function TagBadge({ tag, onRemove, onClick, active }: TagBadgeProps) {
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-default transition-colors
        ${active
          ? 'bg-primary/20 text-primary border border-primary/40'
          : 'bg-base-300 text-base-content/70 border border-base-300'
        }
        ${onClick ? 'cursor-pointer hover:border-primary/60' : ''}
      `}
    >
      {tag}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 hover:text-error transition-colors"
          aria-label={`Tag ${tag} entfernen`}
        >
          ×
        </button>
      )}
    </span>
  );
}
