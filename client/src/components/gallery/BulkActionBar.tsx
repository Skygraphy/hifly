import { useState } from 'react';
import { useGalleryStore } from '../../stores/galleryStore';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useGallery } from '../../hooks/useGallery';

export function BulkActionBar() {
  const { selectedIds, clearSelection } = useGalleryStore();
  const { removeBulk } = useGallery();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const count = selectedIds.size;
  if (count === 0) return null;

  async function handleDelete() {
    setLoading(true);
    try {
      await removeBulk(Array.from(selectedIds));
      clearSelection();
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3
        bg-base-200/95 backdrop-blur-md border border-base-content/10 rounded-2xl shadow-2xl px-5 py-3">
        <span className="text-sm font-medium text-base-content">
          <span className="signal-text font-bold">{count}</span> ausgewählt
        </span>
        <div className="w-px h-5 bg-base-content/10" />
        <button onClick={clearSelection} className="btn btn-ghost btn-xs">
          Abwählen
        </button>
        <button
          onClick={() => setConfirming(true)}
          disabled={loading}
          className="btn btn-error btn-sm"
        >
          {loading ? <span className="loading loading-spinner loading-xs" /> : null}
          Löschen
        </button>
      </div>

      {confirming && (
        <ConfirmDialog
          title={`${count} ${count === 1 ? 'Bild' : 'Bilder'} löschen?`}
          message="Diese Aktion kann nicht rückgängig gemacht werden. Alle Dateien (DNG + JPGs) werden von S3 gelöscht."
          confirmLabel="Endgültig löschen"
          onConfirm={handleDelete}
          onCancel={() => setConfirming(false)}
          danger
        />
      )}
    </>
  );
}
