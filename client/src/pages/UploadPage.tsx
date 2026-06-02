import { DropZone } from '../components/upload/DropZone';
import { FileQueue } from '../components/upload/FileQueue';
import { BatchTagInput } from '../components/upload/BatchTagInput';
import { UploadResults } from '../components/upload/UploadResults';
import { useUploadStore } from '../stores/uploadStore';
import { useUpload } from '../hooks/useUpload';

export function UploadPage() {
  const files = useUploadStore((s) => s.files);
  const clearAll = useUploadStore((s) => s.clearAll);
  const { startUpload } = useUpload();

  const isUploading = files.some((f) => ['hashing', 'uploading', 'processing'].includes(f.status));
  const hasQueued = files.some((f) => f.status === 'queued');
  const allSettled = files.length > 0 && files.every(
    (f) => ['done', 'duplicate', 'error'].includes(f.status)
  );

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

        {/* File queue with batch tags and per-file settings */}
        {files.length > 0 && !allSettled && (
          <>
            <div className="bg-base-200 border border-base-content/8 rounded-2xl p-5 space-y-5">
              <BatchTagInput />
              <div className="divider my-0 opacity-30" />
              <FileQueue />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={startUpload}
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
    </div>
  );
}
