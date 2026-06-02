import { useQuery } from '@tanstack/react-query';
import { TagInput } from '../common/TagInput';
import { ProgressBar } from './ProgressBar';
import { TagBadge } from '../common/TagBadge';
import { useUploadStore, getMergedTags, type UploadFile } from '../../stores/uploadStore';
import { fetchTags } from '../../api/tags';

const STATUS_LABELS: Record<UploadFile['status'], string> = {
  queued:     'Wartend',
  hashing:    'Prüfsumme…',
  duplicate:  'Duplikat',
  uploading:  'Hochladen…',
  processing: 'Verarbeitung…',
  done:       'Fertig',
  error:      'Fehler',
};

interface FileQueueItemProps {
  file: UploadFile;
}

export function FileQueueItem({ file }: FileQueueItemProps) {
  const { batchTags, removeFile, setIndividualTags } = useUploadStore();
  const { data: tagData } = useQuery({ queryKey: ['tags'], queryFn: fetchTags, staleTime: 60000 });
  const suggestions = tagData?.map((t) => t.tag) ?? [];

  const mergedTags = getMergedTags(file, batchTags);
  const isActive = ['uploading', 'hashing', 'processing'].includes(file.status);
  const isDone = file.status === 'done';
  const isError = file.status === 'error';
  const isDuplicate = file.status === 'duplicate';

  return (
    <div className={`p-4 rounded-xl border transition-all
      ${isDone ? 'border-success/20 bg-success/5' : ''}
      ${isError ? 'border-error/20 bg-error/5' : ''}
      ${isDuplicate ? 'border-warning/20 bg-warning/5' : ''}
      ${!isDone && !isError && !isDuplicate ? 'border-base-content/8 bg-base-200' : ''}
    `}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Address + Hash */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-medium text-base-content truncate">
              {file.parsed.address}
            </span>
            <span className="font-mono text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              #{file.parsed.hash}
            </span>
          </div>

          {/* File size */}
          <p className="text-xs text-base-content/40 mt-0.5">
            {(file.file.size / 1024 / 1024).toFixed(1)} MB
          </p>

          {/* Duplicate warning */}
          {isDuplicate && (
            <p className="mt-2 text-xs text-warning">
              Bereits vorhanden als #{file.duplicateHash} — wird übersprungen
            </p>
          )}

          {/* Error message */}
          {isError && file.error && (
            <p className="mt-2 text-xs text-error">{file.error}</p>
          )}

          {/* Progress bar */}
          {(file.status === 'uploading' || file.status === 'processing') && (
            <ProgressBar value={file.progress} className="mt-3" />
          )}

          {/* Tags — only editable when queued */}
          {(file.status === 'queued') && (
            <div className="mt-3">
              <p className="text-xs text-base-content/40 mb-1">Individuelle Tags:</p>
              <TagInput
                tags={file.individualTags}
                onChange={(tags) => setIndividualTags(file.id, tags)}
                placeholder="Nur für dieses Bild…"
                suggestions={suggestions}
              />
              {batchTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className="text-xs text-base-content/30">Batch:</span>
                  {batchTags.map((t) => <TagBadge key={t} tag={t} />)}
                </div>
              )}
            </div>
          )}

          {/* Merged tags (done state) */}
          {isDone && mergedTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {mergedTags.map((t) => <TagBadge key={t} tag={t} active />)}
            </div>
          )}
        </div>

        {/* Status + remove button */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`text-xs font-medium
            ${isError ? 'text-error' : ''}
            ${isDuplicate ? 'text-warning' : ''}
            ${isDone ? 'text-success' : ''}
            ${isActive ? 'text-primary' : ''}
            ${file.status === 'queued' ? 'text-base-content/40' : ''}
          `}>
            {STATUS_LABELS[file.status]}
          </span>

          {!isActive && (
            <button
              type="button"
              onClick={() => removeFile(file.id)}
              className="text-xs text-base-content/30 hover:text-error transition-colors"
              aria-label="Entfernen"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
