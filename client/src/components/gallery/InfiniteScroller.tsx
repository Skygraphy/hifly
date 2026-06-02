import { useEffect, useRef } from 'react';

interface InfiniteScrollerProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
}

export function InfiniteScroller({ onLoadMore, hasMore, isLoading }: InfiniteScrollerProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !isLoading) onLoadMore(); },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, isLoading]);

  return (
    <div ref={sentinelRef} className="flex justify-center py-8">
      {isLoading && (
        <div className="flex items-center gap-2 text-base-content/40 text-sm">
          <span className="loading loading-spinner loading-sm" />
          Lädt…
        </div>
      )}
    </div>
  );
}
