import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DropZone } from '../components/upload/DropZone';
import { FileQueue } from '../components/upload/FileQueue';
import { BatchTagInput } from '../components/upload/BatchTagInput';
import { UploadResults } from '../components/upload/UploadResults';
import { RegionTreePicker } from '../components/common/RegionTreePicker';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useUploadStore, getMergedRegionId } from '../stores/uploadStore';
import { useUpload } from '../hooks/useUpload';
import { fetchRegionTree, findRegion } from '../api/regions';

export function UploadPage() {
  const files = useUploadStore((s) => s.files);
  const clearAll = useUploadStore((s) => s.clearAll);
  const batchRegionId = useUploadStore((s) => s.batchRegionId);
  const setBatchRegionId = useUploadStore((s) => s.setBatchRegionId);
  const { startUpload } = useUpload();

  const [editingRegion, setEditingRegion] = useState(false);
  const [regionWarning, setRegionWarning] = useState(false);

  const { data: regionTree = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: fetchRegionTree,
    staleTime: 300000,
  });

  const selectedRegion = batchRegionId ? findRegion(regionTree, batchRegionId) : null;

  const isUploading = files.some((f) => ['hashing', 'uploading', 'processing'].includes(f.status));
  const hasQueued = files.some((f) => f.status === 'queued');
  const allSettled = files.length > 0 && files.every(
    (f) => ['done', 'duplicate', 'error'].includes(f.status)
  );
  // True if at least one queued file has no region assigned (neither individual nor batch)
  const queuedFiles = files.filter((f) => f.status === 'queued');
  const someWithoutRegion = queuedFiles.some((f) => getMergedRegionId(f, batchRegionId) === null);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold signal-text">Bilder hochladen</h1>
        <p className="text-base-content/50 text-sm mt-1">
          DNG-Dateien auswählen, Tags vergeben und hochladen
        </p>
      </div>

      <div className="space-y-6">
        {/* Drop Zone */}
        <DropZone disabled={isUploading} />

        {/* File queue with batch region, batch tags and per-file settings */}
        {files.length > 0 && !allSettled && (
          <>
            <div className="bg-base-200 border border-base-content/8 rounded-2xl p-5 space-y-5">
              {/* Batch region */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Region</h3>
                  {!editingRegion ? (
                    <button
                      onClick={() => setEditingRegion(true)}
                      className="btn btn-ghost btn-xs text-primary"
                    >
                      {batchRegionId ? 'Ändern' : 'Zuweisen'}
                    </button>
                  ) : (
                    <button onClick={() => setEditingRegion(false)} className="btn btn-ghost btn-xs">
                      Fertig
                    </button>
                  )}
                </div>
                {editingRegion ? (
                  <div className="max-h-48 overflow-y-auto border border-base-content/8 rounded-lg p-2 bg-base-300">
                    <button
                      onClick={() => { setBatchRegionId(null); setEditingRegion(false); }}
                      className="w-full text-left text-xs text-error/60 hover:text-error px-2 py-1 mb-1"
                    >
                      ✕ Keine Region
                    </button>
                    <RegionTreePicker
                      nodes={regionTree}
                      selectedId={batchRegionId}
                      onSelect={(node) => { setBatchRegionId(node?.id ?? null); setEditingRegion(false); }}
                    />
                  </div>
                ) : selectedRegion ? (
                  <p className="text-xs text-base-content/60">{selectedRegion.name}</p>
                ) : someWithoutRegion ? (
                  <div className="flex items-center gap-1.5 text-warning/80">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    <span className="text-xs">Keine Batch-Region — bitte individuell zuweisen</span>
                  </div>
                ) : (
                  <p className="text-xs text-success/70">Alle Bilder über individuelle Region abgedeckt</p>
                )}
              </div>

              <div className="divider my-0 opacity-30" />
              <BatchTagInput />
              <div className="divider my-0 opacity-30" />
              <FileQueue />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => someWithoutRegion ? setRegionWarning(true) : startUpload()}
                disabled={!hasQueued || isUploading}
                className="btn btn-primary flex-1"
              >
                {isUploading ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    Wird hochgeladen…
                  </>
                ) : (
                  `${files.filter((f) => f.status === 'queued').length} Bild${files.filter((f) => f.status === 'queued').length !== 1 ? 'er' : ''} hochladen`
                )}
              </button>
              {!isUploading && (
                <button onClick={clearAll} className="btn btn-ghost">
                  Liste leeren
                </button>
              )}
            </div>
          </>
        )}

        {/* Results summary */}
        {allSettled && <UploadResults />}
      </div>

      {regionWarning && (
        <ConfirmDialog
          title="Keine Region zugewiesen"
          message="Die Bilder werden ohne Regionszuordnung gespeichert und sind im Filter nicht auffindbar. Trotzdem hochladen?"
          confirmLabel="Trotzdem hochladen"
          cancelLabel="Region zuweisen"
          onConfirm={() => { setRegionWarning(false); startUpload(); }}
          onCancel={() => setRegionWarning(false)}
        />
      )}
    </div>
  );
}
