import { useState } from 'react';
import { FilterPanel } from '../components/gallery/FilterPanel';
import { GalleryGrid } from '../components/gallery/GalleryGrid';
import { ImageModal } from '../components/gallery/ImageModal';
import { BulkActionBar } from '../components/gallery/BulkActionBar';
import { useGalleryStore } from '../stores/galleryStore';
import { useGallery } from '../hooks/useGallery';
import type { ImageSummary } from '../api/images';

export function GalleryPage() {
  const [selectedImage, setSelectedImage] = useState<ImageSummary | null>(null);
  const { filterTags, filterAddress, selectedIds, selectAll } = useGalleryStore();
  const { images, total } = useGallery();

  const hasFilters = filterTags.length > 0 || filterAddress;
  const allSelected = images.length > 0 && images.every((img) => selectedIds.has(img.id));

  function handleSelectAll() {
    if (allSelected) {
      useGalleryStore.getState().clearSelection();
    } else {
      selectAll(images.map((img) => img.id));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold signal-text">Galerie</h1>
          {hasFilters && (
            <p className="text-xs text-base-content/40 mt-1">
              Gefiltert — {total.toLocaleString('de')} Ergebnis{total !== 1 ? 'se' : ''}
            </p>
          )}
        </div>
        {images.length > 0 && (
          <button onClick={handleSelectAll} className="btn btn-ghost btn-sm text-base-content/50">
            {allSelected ? 'Alle abwählen' : 'Alle auswählen'}
          </button>
        )}
      </div>

      <div className="flex gap-6">
        <FilterPanel />
        <div className="flex-1 min-w-0">
          <GalleryGrid onImageClick={setSelectedImage} />
        </div>
      </div>

      {selectedImage && (
        <ImageModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          onDeleted={() => setSelectedImage(null)}
        />
      )}

      <BulkActionBar />
    </div>
  );
}
