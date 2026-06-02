import { apiClient } from './client';

export type ProcessingStatus = 'pending' | 'processing' | 'ready' | 'error';

export interface ImageSummary {
  hash: string;
  address: string;
  tags: string[];
  status: ProcessingStatus;
  thumbUrl: string | null;
  uploadTimestamp: string;
  fileSizeBytes: number | null;
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
}

export interface UploadInitiateResult {
  hash: string;
  isDuplicate: boolean;
  duplicateHash?: string;
  presignedUrl?: string;
  s3Key?: string;
}

export async function fetchImages(params: {
  tags?: string[];
  address?: string;
  status?: ProcessingStatus;
  page: number;
  limit: number;
}): Promise<GalleryResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(params.page));
  searchParams.set('limit', String(params.limit));
  if (params.tags?.length) params.tags.forEach((t) => searchParams.append('tags[]', t));
  if (params.address) searchParams.set('address', params.address);
  if (params.status) searchParams.set('status', params.status);

  const { data } = await apiClient.get(`/images?${searchParams}`);
  return data;
}

export async function fetchImage(hash: string): Promise<ImageDetail> {
  const { data } = await apiClient.get(`/images/${hash}`);
  return data.data;
}

export async function updateImageTags(hash: string, tags: string[]): Promise<string[]> {
  const { data } = await apiClient.patch(`/images/${hash}/tags`, { tags });
  return data.data.tags;
}

export async function deleteImage(hash: string): Promise<void> {
  await apiClient.delete(`/images/${hash}`);
}

export async function deleteImages(hashes: string[]): Promise<void> {
  await apiClient.delete('/images', { data: { hashes } });
}

export async function initiateUpload(files: UploadInitiateFile[]): Promise<UploadInitiateResult[]> {
  const { data } = await apiClient.post('/upload/initiate', { files });
  return data.data;
}

export async function confirmUpload(hash: string, s3Key: string): Promise<void> {
  await apiClient.post('/upload/confirm', { hash, s3Key });
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
