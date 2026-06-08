import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FilterPanel } from '../components/gallery/FilterPanel';
import { GalleryGrid } from '../components/gallery/GalleryGrid';
import { PublicImageModal } from '../components/gallery/PublicImageModal';
import { PublicNavbar } from '../components/layout/PublicNavbar';
import { fetchSettings } from '../api/settings';
import { fetchRegionTree } from '../api/regions';
import { useGalleryStore } from '../stores/galleryStore';
import type { ImageSummary } from '../api/images';

function buildBreadcrumb(nodes: ReturnType<typeof Array>, id: string): string[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function search(list: any[], path: string[]): string[] | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const n of list) {
      const curr = [...path, n.name];
      if (n.id === id) return curr;
      const found = search(n.children, curr);
      if (found) return found;
    }
    return null;
  }
  return search(nodes, []) ?? [];
}

export function PublicGalleryPage() {
  const [selectedImage, setSelectedImage] = useState<ImageSummary | null>(null);
  const { filterRegionId, setFilterRegion } = useGalleryStore();

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
    staleTime: 60000,
  });

  const { data: regionTree = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: fetchRegionTree,
    staleTime: 300000,
  });

  // Apply default region from settings (only on first load, if no filter is set)
  useEffect(() => {
    if (!settings || filterRegionId) return;
    const defaultRegionSetting = settings.find((s) => s.key === 'default_region_id');
    const defaultId = defaultRegionSetting?.value;
    if (defaultId && typeof defaultId === 'string' && regionTree.length > 0) {
      const path = buildBreadcrumb(regionTree, defaultId);
      if (path.length > 0) setFilterRegion(defaultId, path);
    }
  }, [settings, regionTree, filterRegionId, setFilterRegion]);

  return (
    <div className="min-h-screen bg-base-100">
      <PublicNavbar />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold signal-text">Bildarchiv</h1>
          <p className="text-base-content/40 text-sm mt-1">
            Bilder ansehen ist kostenlos — zum Herunterladen bitte anmelden.
          </p>
        </div>
        <div className="flex gap-6">
          <FilterPanel />
          <div className="flex-1 min-w-0">
            <GalleryGrid onImageClick={setSelectedImage} />
          </div>
        </div>
        {selectedImage && (
          <PublicImageModal
            image={selectedImage}
            onClose={() => setSelectedImage(null)}
          />
        )}
      </main>
    </div>
  );
}
