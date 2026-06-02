import { Link } from 'react-router-dom';
import { useUploadStore } from '../../stores/uploadStore';

export function UploadResults() {
  const files = useUploadStore((s) => s.files);
  const clearAll = useUploadStore((s) => s.clearAll);

  const done = files.filter((f) => f.status === 'done');
  const errors = files.filter((f) => f.status === 'error');
  const dups = files.filter((f) => f.status === 'duplicate');
  const total = done.length + errors.length + dups.length;
  const allSettled = files.length > 0 && total === files.length;

  if (!allSettled) return null;

  return (
    <div className="p-5 bg-base-200 border border-base-content/8 rounded-2xl">
      <h3 className="font-semibold text-base-content mb-3">Upload abgeschlossen</h3>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-3 bg-success/10 rounded-xl">
          <p className="text-2xl font-bold text-success">{done.length}</p>
          <p className="text-xs text-success/70 mt-0.5">Hochgeladen</p>
        </div>
        <div className="text-center p-3 bg-warning/10 rounded-xl">
          <p className="text-2xl font-bold text-warning">{dups.length}</p>
          <p className="text-xs text-warning/70 mt-0.5">Duplikate</p>
        </div>
        <div className="text-center p-3 bg-error/10 rounded-xl">
          <p className="text-2xl font-bold text-error">{errors.length}</p>
          <p className="text-xs text-error/70 mt-0.5">Fehler</p>
        </div>
      </div>
      <div className="flex gap-3">
        <Link to="/gallery" className="btn btn-primary btn-sm flex-1">Zur Galerie</Link>
        <button onClick={clearAll} className="btn btn-ghost btn-sm flex-1">Neue Uploads</button>
      </div>
    </div>
  );
}
