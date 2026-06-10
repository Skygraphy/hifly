import { useCallback, useState, DragEvent } from 'react';
import { parseFilename } from '../../lib/parseFilename';
import { useUploadStore, type UploadFile } from '../../stores/uploadStore';

function randomId() {
  return Math.random().toString(36).slice(2);
}

interface DropZoneProps {
  disabled?: boolean;
}

export function DropZone({ disabled }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [invalidFiles, setInvalidFiles] = useState<string[]>([]);
  const addFiles = useUploadStore((s) => s.addFiles);
  const clearAll = useUploadStore((s) => s.clearAll);
  const existing = useUploadStore((s) => s.files);

  const processFiles = useCallback((rawFiles: File[]) => {
    // If all previous uploads are settled, start fresh automatically
    const currentFiles = useUploadStore.getState().files;
    const allSettled = currentFiles.length > 0 &&
      currentFiles.every((f) => ['done', 'duplicate', 'error'].includes(f.status));
    if (allSettled) clearAll();

    const activeFiles = useUploadStore.getState().files;
    const invalid: string[] = [];
    const valid: UploadFile[] = [];

    for (const file of rawFiles) {
      const upperName = file.name.toUpperCase();
      if (!upperName.endsWith('.DNG')) {
        invalid.push(file.name);
        continue;
      }
      const parsed = parseFilename(file.name);
      if (!parsed) {
        invalid.push(file.name);
        continue;
      }
      // Prevent adding same filename twice — check store AND current batch
      // (Server-side checksum check catches true DB duplicates separately)
      if (activeFiles.some((e) => e.file.name === file.name)) continue;
      if (valid.some((v) => v.file.name === file.name)) continue;

      valid.push({
        id: randomId(),
        file,
        parsed,
        checksum: null,
        individualTags: [],
        individualRegionId: null,
        status: 'queued',
        progress: 0,
      });
    }

    if (valid.length > 0) addFiles(valid);
    setInvalidFiles(invalid);
    setTimeout(() => setInvalidFiles([]), 5000);
  }, [addFiles, clearAll]);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    processFiles(files);
    e.target.value = '';
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200
          ${dragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-base-content/15 hover:border-primary/40 hover:bg-primary/5'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-base-content">
              DNG-Dateien hierher ziehen
            </p>
            <p className="text-sm text-base-content/50 mt-1">
              oder Dateien auswählen (Mehrfachauswahl möglich)
            </p>
          </div>
          <label className="btn btn-primary btn-sm">
            Dateien wählen
            <input
              type="file"
              multiple
              accept=".dng,.DNG"
              onChange={handleFileInput}
              disabled={disabled}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      {invalidFiles.length > 0 && (
        <div className="mt-3 p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">
          Ungültige Dateien (falsches Format): {invalidFiles.join(', ')}
        </div>
      )}
    </div>
  );
}
