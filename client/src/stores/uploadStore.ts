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
  status: UploadFileStatus;
  progress: number;
  duplicateId?: string;    // id of the existing duplicate image
  error?: string;
}

interface UploadState {
  files: UploadFile[];
  batchTags: string[];
  addFiles: (files: UploadFile[]) => void;
  updateFile: (id: string, patch: Partial<UploadFile>) => void;
  removeFile: (id: string) => void;
  clearAll: () => void;
  setBatchTags: (tags: string[]) => void;
  setIndividualTags: (id: string, tags: string[]) => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  files: [],
  batchTags: [],
  addFiles: (files) => set((s) => ({ files: [...s.files, ...files] })),
  updateFile: (id, patch) =>
    set((s) => ({ files: s.files.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),
  removeFile: (id) => set((s) => ({ files: s.files.filter((f) => f.id !== id) })),
  clearAll: () => set({ files: [] }),
  setBatchTags: (batchTags) => set({ batchTags }),
  setIndividualTags: (id, tags) =>
    set((s) => ({
      files: s.files.map((f) => (f.id === id ? { ...f, individualTags: tags } : f)),
    })),
}));

export function getMergedTags(file: UploadFile, batchTags: string[]): string[] {
  const merged = new Set([...batchTags, ...file.individualTags]);
  return Array.from(merged);
}
