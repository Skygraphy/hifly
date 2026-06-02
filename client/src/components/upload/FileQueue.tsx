import { useUploadStore } from '../../stores/uploadStore';
import { FileQueueItem } from './FileQueueItem';

export function FileQueue() {
  const files = useUploadStore((s) => s.files);

  if (files.length === 0) return null;

  const doneCount = files.filter((f) => f.status === 'done').length;
  const errorCount = files.filter((f) => f.status === 'error').length;
  const dupCount = files.filter((f) => f.status === 'duplicate').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-base-content">
          {files.length} {files.length === 1 ? 'Datei' : 'Dateien'}
        </h3>
        <div className="flex gap-3 text-xs text-base-content/50">
          {doneCount > 0 && <span className="text-success">{doneCount} fertig</span>}
          {errorCount > 0 && <span className="text-error">{errorCount} Fehler</span>}
          {dupCount > 0 && <span className="text-warning">{dupCount} Duplikat{dupCount > 1 ? 'e' : ''}</span>}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {files.map((file) => (
          <FileQueueItem key={file.id} file={file} />
        ))}
      </div>
    </div>
  );
}
