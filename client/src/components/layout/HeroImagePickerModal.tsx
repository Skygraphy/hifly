import { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchImages, type ImageSummary } from '../../api/images';

const MAX = 5;

interface HeroImagePickerModalProps {
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
  onClose: () => void;
}

export function HeroImagePickerModal({ selectedIds, onConfirm, onClose }: HeroImagePickerModalProps) {
  const [localSelected, setLocalSelected] = useState<string[]>(selectedIds);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const query = useInfiniteQuery({
    queryKey: ['hero-picker-images'],
    queryFn: ({ pageParam = 1 }) => fetchImages({ status: 'ready', page: pageParam as number, limit: 30 }),
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.page + 1 : undefined),
    initialPageParam: 1,
    staleTime: 60000,
  });

  const allImages: ImageSummary[] = query.data?.pages.flatMap((p) => p.data) ?? [];

  function toggle(id: string) {
    setLocalSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX) return prev; // max 5
      return [...prev, id];
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-base-200 border border-base-content/10 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden"
        style={{ maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-content/8">
          <div>
            <h2 className="font-semibold text-base-content">Hero-Bilder auswählen</h2>
            <p className="text-xs text-base-content/40 mt-0.5">
              {localSelected.length}/{MAX} ausgewählt — klicke Bilder um sie ein-/auszuwählen
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle text-base-content/50">✕</button>
        </div>

        {/* Image grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {query.isLoading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          ) : allImages.length === 0 ? (
            <p className="text-center text-base-content/30 text-sm py-12">
              Keine fertigen Bilder vorhanden
            </p>
          ) : (
            <>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {allImages.map((img) => {
                  const isSelected = localSelected.includes(img.id);
                  const isDisabled = !isSelected && localSelected.length >= MAX;
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => toggle(img.id)}
                      disabled={isDisabled}
                      className={`relative aspect-square rounded-xl overflow-hidden transition-all duration-150
                        ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                        ${isSelected ? 'ring-2 ring-primary ring-offset-1 ring-offset-base-200' : ''}
                      `}
                    >
                      {img.thumbUrl ? (
                        <img src={img.thumbUrl} alt={img.address} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-base-300" />
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-primary-content" fill="none" viewBox="0 0 12 12">
                              <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M10 3L5 8.5 2 5.5" />
                            </svg>
                          </div>
                        </div>
                      )}
                      {/* Order number for selected */}
                      {isSelected && (
                        <div
                          className="absolute top-1 left-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                          style={{ background: 'linear-gradient(135deg, #FF6B6B, #FFAD3B)', color: '#0d0d18' }}
                        >
                          {localSelected.indexOf(img.id) + 1}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {query.hasNextPage && (
                <button
                  onClick={() => query.fetchNextPage()}
                  disabled={query.isFetchingNextPage}
                  className="btn btn-ghost btn-sm w-full mt-4"
                >
                  {query.isFetchingNextPage ? <span className="loading loading-spinner loading-xs" /> : 'Mehr laden'}
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-base-content/8">
          <button onClick={() => setLocalSelected([])} className="btn btn-ghost btn-sm text-base-content/40">
            Alle entfernen
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn btn-ghost btn-sm">Abbrechen</button>
            <button
              onClick={() => onConfirm(localSelected)}
              className="btn btn-primary btn-sm"
            >
              Übernehmen ({localSelected.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
