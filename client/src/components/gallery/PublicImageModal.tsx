import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TagBadge } from '../common/TagBadge';
import { StatusBadge } from '../common/StatusBadge';
import { LoginModal } from '../common/LoginModal';
import { fetchImage } from '../../api/images';
import { useAuth } from '../../hooks/useAuth';
import type { ImageSummary } from '../../api/images';

interface PublicImageModalProps {
  image: ImageSummary;
  onClose: () => void;
}

export function PublicImageModal({ image, onClose }: PublicImageModalProps) {
  const { isAuthenticated } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<string | null>(null);

  const { data: detail, isLoading } = useQuery({
    queryKey: ['image-public', image.id],
    queryFn: () => fetchImage(image.id),
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // After login, trigger the pending download
  useEffect(() => {
    if (isAuthenticated && pendingDownload) {
      window.open(pendingDownload, '_blank');
      setPendingDownload(null);
    }
  }, [isAuthenticated, pendingDownload]);

  function handleDownloadClick(e: React.MouseEvent<HTMLAnchorElement>, url: string) {
    if (!isAuthenticated) {
      e.preventDefault();
      setPendingDownload(url);
      setShowLogin(true);
    }
  }

  const downloadBtn = (url: string | null | undefined, label: string, filename?: string) => {
    if (!url) return null;
    return (
      <a
        href={isAuthenticated ? url : '#'}
        download={filename}
        onClick={(e) => handleDownloadClick(e, url)}
        className="btn btn-outline btn-sm flex-1 gap-1.5"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        {label}
        {!isAuthenticated && <span className="text-[10px] opacity-50">🔒</span>}
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
          className="bg-base-200 border border-base-content/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-base-content/8">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-base-content">{image.address}</h2>
                <span className="font-mono text-sm text-primary bg-primary/10 px-2 py-0.5 rounded">
                  #{image.hash}
                </span>
                <StatusBadge status={image.status} />
              </div>
            </div>
            <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle text-base-content/50">✕</button>
          </div>

          {/* Content */}
          <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
            {/* Image */}
            <div className="lg:flex-1 bg-base-300 flex items-center justify-center min-h-64">
              {isLoading ? (
                <span className="loading loading-spinner loading-lg text-primary" />
              ) : detail?.urls.large ? (
                <img src={detail.urls.large} alt={detail.address}
                  className="max-w-full max-h-full object-contain" style={{ maxHeight: '60vh' }} />
              ) : detail?.urls.thumb ? (
                <img src={detail.urls.thumb} alt={detail.address}
                  className="max-w-full max-h-full object-contain" style={{ maxHeight: '60vh' }} />
              ) : (
                <div className="text-base-content/30 text-sm">Vorschau nicht verfügbar</div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:w-64 p-4 flex flex-col gap-4 overflow-y-auto border-t lg:border-t-0 lg:border-l border-base-content/8">
              {/* Tags */}
              {image.tags.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {image.tags.map((t) => <TagBadge key={t} tag={t} active />)}
                  </div>
                </div>
              )}

              {/* Downloads */}
              <div>
                <h3 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-2">
                  Download
                  {!isAuthenticated && (
                    <span className="ml-2 text-base-content/25 normal-case font-normal">
                      (Anmeldung erforderlich)
                    </span>
                  )}
                </h3>
                {image.status === 'ready' ? (
                  <div className="grid grid-cols-2 gap-2">
                    {downloadBtn(detail?.urls.original, 'DNG', detail?.originalFilename)}
                    {downloadBtn(detail?.urls.large, 'Groß')}
                    {downloadBtn(detail?.urls.medium, 'Mittel')}
                    {downloadBtn(detail?.urls.small, 'Klein')}
                  </div>
                ) : (
                  <p className="text-xs text-base-content/30">Wird noch verarbeitet…</p>
                )}
              </div>

              {!isAuthenticated && (
                <button
                  onClick={() => setShowLogin(true)}
                  className="btn btn-primary btn-sm w-full mt-auto"
                >
                  Anmelden zum Herunterladen
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showLogin && (
        <LoginModal
          message="Zum Herunterladen bitte anmelden oder registrieren."
          onClose={() => setShowLogin(false)}
          onSuccess={() => setShowLogin(false)}
        />
      )}
    </>
  );
}
