import { useState } from 'react';
import { TagBadge } from '../common/TagBadge';
import { StatusBadge } from '../common/StatusBadge';
import { useGalleryStore } from '../../stores/galleryStore';
import type { ImageSummary } from '../../api/images';

interface ImageCardProps {
  image: ImageSummary;
  onClick: () => void;
  anySelected: boolean;
}

export function ImageCard({ image, onClick, anySelected }: ImageCardProps) {
  const { selectedIds, toggleSelection } = useGalleryStore();
  const [imgError, setImgError] = useState(false);
  const isSelected = selectedIds.has(image.id);
  const showCheckbox = anySelected || isSelected;

  function handleCheckboxClick(e: React.MouseEvent) {
    e.stopPropagation();
    toggleSelection(image.id);
  }

  return (
    <div
      onClick={onClick}
      className={`group relative bg-base-200 rounded-2xl overflow-hidden cursor-pointer card-hover
        ${isSelected ? 'ring-2 ring-primary ring-offset-1 ring-offset-base-100' : 'border border-base-content/5'}
      `}
    >
      {/* Thumbnail */}
      <div className="aspect-square bg-base-300 relative overflow-hidden">
        {image.thumbUrl && !imgError ? (
          <img
            src={image.thumbUrl}
            alt={image.address}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {image.status !== 'ready' ? (
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-base-content/30">Verarbeitung…</p>
              </div>
            ) : (
              <svg className="w-10 h-10 text-base-content/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 3h18M3 21h18" />
              </svg>
            )}
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        {/* Checkbox */}
        <div
          className={`absolute top-2 left-2 transition-opacity duration-150
            ${showCheckbox ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          `}
          onClick={handleCheckboxClick}
        >
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
            ${isSelected ? 'bg-primary border-primary' : 'bg-black/40 border-white/60 backdrop-blur-sm'}
          `}>
            {isSelected && (
              <svg className="w-3 h-3 text-primary-content" fill="currentColor" viewBox="0 0 12 12">
                <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </div>

        {/* Status badge (only for non-ready) */}
        {image.status !== 'ready' && (
          <div className="absolute top-2 right-2">
            <StatusBadge status={image.status} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-base-content truncate" title={image.address}>
          {image.address}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="font-mono text-xs text-primary">#{image.hash}</span>
          {image.fileSizeBytes && (
            <span className="text-xs text-base-content/30">
              {(image.fileSizeBytes / 1024 / 1024).toFixed(0)} MB
            </span>
          )}
        </div>
        {image.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {image.tags.slice(0, 3).map((t) => <TagBadge key={t} tag={t} />)}
            {image.tags.length > 3 && (
              <span className="text-xs text-base-content/30">+{image.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
