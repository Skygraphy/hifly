import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TagInput } from '../common/TagInput';
import { TagBadge } from '../common/TagBadge';
import { StatusBadge } from '../common/StatusBadge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { fetchImage, updateImageTags, deleteImage } from '../../api/images';
import { fetchTags } from '../../api/tags';
import type { ImageSummary } from '../../api/images';

interface ImageModalProps {
  image: ImageSummary;
  onClose: () => void;
  onDeleted: () => void;
}

export function ImageModal({ image, onClose, onDeleted }: ImageModalProps) {
  const [editingTags, setEditingTags] = useState(false);
  const [localTags, setLocalTags] = useState<string[]>([]);
  const [savingTags, setSavingTags] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();

  const { data: detail, isLoading } = useQuery({
    queryKey: ['image', image.hash],
    queryFn: () => fetchImage(image.hash),
    refetchInterval: image.status !== 'ready' ? 3000 : false,
  });

  const { data: tagData } = useQuery({ queryKey: ['tags'], queryFn: fetchTags, staleTime: 60000 });
  const tagSuggestions = tagData?.map((t) => t.tag) ?? [];

  useEffect(() => {
    if (detail) setLocalTags(detail.tags);
  }, [detail]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function saveTags() {
    if (!detail) return;
    setSavingTags(true);
    try {
      await updateImageTags(detail.hash, localTags);
      queryClient.invalidateQueries({ queryKey: ['images'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setEditingTags(false);
    } finally {
      setSavingTags(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteImage(image.hash);
      queryClient.invalidateQueries({ queryKey: ['images'] });
      onDeleted();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  const downloadLink = (url: string | null | undefined, label: string, filename?: string) => {
    if (!url) return null;
    return (
      <a
        href={url}
        download={filename}
        className="btn btn-outline btn-sm flex-1 gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        {label}
      </a>
    );
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-base-200 border border-base-content/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-base-content/8">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-base-content">{detail?.address ?? image.address}</h2>
                <span className="font-mono text-sm text-primary bg-primary/10 px-2 py-0.5 rounded">
                  #{detail?.hash ?? image.hash}
                </span>
                <StatusBadge status={detail?.status ?? image.status} />
              </div>
              {detail?.fileSizeBytes && (
                <p className="text-xs text-base-content/40 mt-0.5">
                  {(detail.fileSizeBytes / 1024 / 1024).toFixed(1)} MB
                </p>
              )}
            </div>
            <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle text-base-content/50">
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
            {/* Image */}
            <div className="lg:flex-1 bg-base-300 flex items-center justify-center min-h-64 lg:min-h-0">
              {isLoading ? (
                <span className="loading loading-spinner loading-lg text-primary" />
              ) : detail?.urls.large ? (
                <img
                  src={detail.urls.large}
                  alt={detail.address}
                  className="max-w-full max-h-full object-contain"
                  style={{ maxHeight: '60vh' }}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-base-content/30">
                  <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <p className="text-sm">Wird verarbeitet…</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:w-72 p-4 flex flex-col gap-4 overflow-y-auto border-t lg:border-t-0 lg:border-l border-base-content/8">
              {/* Tags */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Tags</h3>
                  {!editingTags ? (
                    <button onClick={() => { setEditingTags(true); setLocalTags(detail?.tags ?? []); }}
                      className="btn btn-ghost btn-xs text-primary">
                      Bearbeiten
                    </button>
                  ) : (
                    <div className="flex gap-1">
                      <button onClick={() => setEditingTags(false)} className="btn btn-ghost btn-xs">Abbruch</button>
                      <button onClick={saveTags} disabled={savingTags} className="btn btn-primary btn-xs">
                        {savingTags ? <span className="loading loading-spinner loading-xs" /> : 'Speichern'}
                      </button>
                    </div>
                  )}
                </div>
                {editingTags ? (
                  <TagInput tags={localTags} onChange={setLocalTags} suggestions={tagSuggestions} />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {(detail?.tags ?? image.tags).length > 0
                      ? (detail?.tags ?? image.tags).map((t) => <TagBadge key={t} tag={t} active />)
                      : <p className="text-xs text-base-content/30">Keine Tags</p>
                    }
                  </div>
                )}
              </div>

              {/* Downloads */}
              {detail?.status === 'ready' && (
                <div>
                  <h3 className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2">Download</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {downloadLink(detail.urls.original, 'DNG', detail.originalFilename)}
                    {downloadLink(detail.urls.large, 'Groß')}
                    {downloadLink(detail.urls.medium, 'Mittel')}
                    {downloadLink(detail.urls.small, 'Klein')}
                  </div>
                </div>
              )}

              {/* Delete */}
              <div className="mt-auto pt-3 border-t border-base-content/8">
                <button
                  onClick={() => setConfirmDelete(true)}
                  disabled={deleting}
                  className="btn btn-error btn-sm btn-outline w-full"
                >
                  {deleting ? <span className="loading loading-spinner loading-xs" /> : null}
                  Bild löschen
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Bild löschen?"
          message={`#${image.hash} — ${image.address} wird unwiderruflich gelöscht (DNG + alle JPGs).`}
          confirmLabel="Endgültig löschen"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
          danger
        />
      )}
    </>
  );
}
