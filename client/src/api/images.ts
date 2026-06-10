import { apiClient } from './client';

export type ProcessingStatus = 'pending' | 'processing' | 'ready' | 'error';

export interface ImageSummary {
  id: string;        // full filename without extension (primary key)
  hash: string;      // 4-char display/reference code
  address: string;
  tags: string[];
  status: ProcessingStatus;
  thumbUrl: string | null;
  uploadTimestamp: string;
  fileSizeBytes: number | null;
  isOwner: boolean;
  regionId: string | null;
  regionPath: string[]; // e.g. ['Österreich', 'Niederösterreich', 'Klosterneuburg']
}

export interface ImageDetail extends ImageSummary {
  originalFilename: string;
  urls: {
    thumb: string | null;
    small: string | null;
    medium: string | null;
    large: string | null;
    original: string | null;
  };
}

export interface GalleryMeta {
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface GalleryResponse {
  data: ImageSummary[];
  meta: GalleryMeta;
}

export interface UploadInitiateFile {
  filename: string;
  fileSize: number;
  checksum: string;
  tags?: string[];
  regionId?: string | null;
}

export interface UploadInitiateResult {
  id: string;
  hash: string;
  isDuplicate: boolean;
  duplicateId?: string;
  presignedUrl?: string;
  s3Key?: string;
}

export async function fetchImages(params: {
  tags?: string[];
  address?: string;
  status?: ProcessingStatus;
  regionId?: string;
  page: number;
  limit: number;
}): Promise<GalleryResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(params.page));
  searchParams.set('limit', String(params.limit));
  if (params.tags?.length) params.tags.forEach((t) => searchParams.append('tags[]', t));
  if (params.address) searchParams.set('address', params.address);
  if (params.status) searchParams.set('status', params.status);
  if (params.regionId) searchParams.set('regionId', params.regionId);

  const { data } = await apiClient.get(`/images?${searchParams}`);
  return data;
}

export async function fetchImage(id: string): Promise<ImageDetail> {
  const { data } = await apiClient.get(`/images/${encodeURIComponent(id)}`, {
    params: { _t: Date.now() },
    headers: { 'Cache-Control': 'no-cache' },
  });
  return data.data;
}

export async function updateImageTags(id: string, tags: string[]): Promise<string[]> {
  const { data } = await apiClient.patch(`/images/${encodeURIComponent(id)}/tags`, { tags });
  return data.data.tags;
}

export async function deleteImage(id: string): Promise<void> {
  await apiClient.delete(`/images/${encodeURIComponent(id)}`);
}

export async function deleteImages(ids: string[]): Promise<void> {
  await apiClient.delete('/images', { data: { ids } });
}

export async function bulkUpdateRegion(ids: string[], regionId: string | null): Promise<void> {
  await apiClient.patch('/images/bulk/region', { ids, regionId });
}

export async function bulkUpdateTags(ids: string[], tags: string[], mode: 'replace' | 'merge' = 'replace'): Promise<void> {
  await apiClient.patch('/images/bulk/tags', { ids, tags, mode });
}

export async function initiateUpload(files: UploadInitiateFile[]): Promise<UploadInitiateResult[]> {
  const { data } = await apiClient.post('/upload/initiate', { files });
  return data.data;
}

export async function confirmUpload(id: string, s3Key: string): Promise<void> {
  await apiClient.post('/upload/confirm', { id, s3Key });
}

export function uploadToS3(
  presignedUrl: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', 'image/x-adobe-dng');
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`S3 upload failed: ${xhr.status}`));
    });
    xhr.addEventListener('error', () => reject(new Error('Network error during S3 upload')));
    xhr.send(file);
  });
}
