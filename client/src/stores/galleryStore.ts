import { create } from 'zustand';

interface GalleryState {
  filterTags: string[];
  filterAddress: string;
  selectedHashes: Set<string>;
  setFilterTags: (tags: string[]) => void;
  setFilterAddress: (address: string) => void;
  toggleSelection: (hash: string) => void;
  selectAll: (hashes: string[]) => void;
  clearSelection: () => void;
}

export const useGalleryStore = create<GalleryState>((set) => ({
  filterTags: [],
  filterAddress: '',
  selectedHashes: new Set(),
  setFilterTags: (tags) => set({ filterTags: tags }),
  setFilterAddress: (address) => set({ filterAddress: address }),
  toggleSelection: (hash) =>
    set((state) => {
      const next = new Set(state.selectedHashes);
      if (next.has(hash)) next.delete(hash);
      else next.add(hash);
      return { selectedHashes: next };
    }),
  selectAll: (hashes) => set({ selectedHashes: new Set(hashes) }),
  clearSelection: () => set({ selectedHashes: new Set() }),
}));
