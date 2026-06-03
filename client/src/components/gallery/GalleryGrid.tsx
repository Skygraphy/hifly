import { ImageCard } from './ImageCard';
import { InfiniteScroller } from './InfiniteScroller';
import { useGallery } from '../../hooks/useGallery';
import { useGalleryStore } from '../../stores/galleryStore';
import type { ImageSummary } from '../../api/images';

interface GalleryGridProps {
  onImageClick: (image: ImageSummary) => void;
}

export function GalleryGrid({ onImageClick }: GalleryGridProps) {
  const { images, total, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useGallery();
  const selectedIds = useGalleryStore((s) => s.selectedIds);
  const anySelected = selectedIds.size > 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="aspect-square bg-base-300 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-base-content/30">
        <svg className="w-16 h-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 3h18M3 21h18" />
        </svg>
        <p className="text-lg font-medium">Keine Bilder gefunden</p>
        <p className="text-sm mt-1">Filter anpassen oder neue Bilder hochladen</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-base-content/40 mb-4">
        {total.toLocaleString('de')} {total === 1 ? 'Bild' : 'Bilder'} gesamt
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {images.map((image) => (
          <ImageCard
            key={image.id}
            image={image}
            onClick={() => onImageClick(image)}
            anySelected={anySelected}
          />
        ))}
      </div>
      <InfiniteScroller
        onLoadMore={fetchNextPage}
        hasMore={!!hasNextPage}
        isLoading={isFetchingNextPage}
      />
    </div>
  );
}
