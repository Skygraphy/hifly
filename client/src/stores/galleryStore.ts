import { create } from 'zustand';

interface GalleryState {
  filterTags: string[];
  filterAddress: string;
  selectedIds: Set<string>;
  setFilterTags: (tags: string[]) => void;
  setFilterAddress: (address: string) => void;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
}

export const useGalleryStore = create<GalleryState>((set) => ({
  filterTags: [],
  filterAddress: '',
  selectedIds: new Set(),
  setFilterTags: (tags) => set({ filterTags: tags }),
  setFilterAddress: (address) => set({ filterAddress: address }),
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
