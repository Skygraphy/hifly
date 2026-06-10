import { create } from 'zustand';
import { ParsedFilename } from '../lib/parseFilename';

export type UploadFileStatus =
  | 'queued'
  | 'hashing'
  | 'duplicate'
  | 'uploading'
  | 'processing'
  | 'done'
  | 'error';

export interface UploadFile {
  id: string;              // local uuid for list management
  file: File;
  parsed: ParsedFilename;
  checksum: string | null;
  individualTags: string[];
  individualRegionId: string | null; // null = use batchRegionId
  status: UploadFileStatus;
  progress: number;
  duplicateId?: string;    // id of the existing duplicate image
  error?: string;
}

interface UploadState {
  files: UploadFile[];
  batchTags: string[];
  batchRegionId: string | null;
  addFiles: (files: UploadFile[]) => void;
  updateFile: (id: string, patch: Partial<UploadFile>) => void;
  removeFile: (id: string) => void;
  clearAll: () => void;
  setBatchTags: (tags: string[]) => void;
  setBatchRegionId: (id: string | null) => void;
  setIndividualRegionId: (id: string, regionId: string | null) => void;
  setIndividualTags: (id: string, tags: string[]) => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  files: [],
  batchTags: [],
  batchRegionId: null,
  addFiles: (files) => set((s) => ({ files: [...s.files, ...files] })),
  updateFile: (id, patch) =>
    set((s) => ({ files: s.files.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),
  removeFile: (id) => set((s) => ({ files: s.files.filter((f) => f.id !== id) })),
  clearAll: () => set({ files: [] }),
  setBatchTags: (batchTags) => set({ batchTags }),
  setBatchRegionId: (batchRegionId) => set({ batchRegionId }),
  setIndividualRegionId: (id, regionId) =>
    set((s) => ({
      files: s.files.map((f) => (f.id === id ? { ...f, individualRegionId: regionId } : f)),
    })),
  setIndividualTags: (id, tags) =>
    set((s) => ({
      files: s.files.map((f) => (f.id === id ? { ...f, individualTags: tags } : f)),
    })),
}));

export function getMergedTags(file: UploadFile, batchTags: string[]): string[] {
  const merged = new Set([...batchTags, ...file.individualTags]);
  return Array.from(merged);
}

/** Individual region overrides batch region; null means "no region" only when batch is also null. */
export function getMergedRegionId(file: UploadFile, batchRegionId: string | null): string | null {
  return file.individualRegionId !== null ? file.individualRegionId : batchRegionId;
}
