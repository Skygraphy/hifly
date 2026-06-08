import { create } from 'zustand';

interface GalleryState {
  filterTags: string[];
  filterAddress: string;
  filterRegionId: string | null;    // UUID of selected region
  filterRegionPath: string[];       // breadcrumb for display
  selectedIds: Set<string>;
  setFilterTags: (tags: string[]) => void;
  setFilterAddress: (address: string) => void;
  setFilterRegion: (regionId: string | null, regionPath: string[]) => void;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
}

export const useGalleryStore = create<GalleryState>((set) => ({
  filterTags: [],
  filterAddress: '',
  filterRegionId: null,
  filterRegionPath: [],
  selectedIds: new Set(),
  setFilterTags: (tags) => set({ filterTags: tags }),
  setFilterAddress: (address) => set({ filterAddress: address }),
  setFilterRegion: (regionId, regionPath) => set({ filterRegionId: regionId, filterRegionPath: regionPath }),
  toggleSelection: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    }),
  selectAll: (ids) => set({ selectedIds: new Set(ids) }),
  clearSelection: () => set({ selectedIds: new Set() }),
}));
