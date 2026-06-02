import { supabase } from '../config/supabase';
import { generateDownloadUrl, generateAllUrls } from './s3.service';
import type { ImageRow, ImageSummary, ImageDetail, ProcessingStatus } from '../types';

// capture_date is excluded from all SELECT queries intentionally
const SUMMARY_FIELDS = 'hash, address, tags, processing_status, upload_timestamp, file_size_bytes, s3_key_prefix';
const DETAIL_FIELDS = `${SUMMARY_FIELDS}, original_filename`;

export interface ListParams {
  tags?: string[];
  address?: string;
  status?: ProcessingStatus;
  page: number;
  limit: number;
}

export async function listImages(params: ListParams): Promise<{ data: ImageSummary[]; total: number }> {
  const offset = (params.page - 1) * params.limit;

  let query = supabase
    .from('images')
    .select(SUMMARY_FIELDS, { count: 'exact' })
    .order('upload_timestamp', { ascending: false })
    .range(offset, offset + params.limit - 1);

  if (params.tags && params.tags.length > 0) {
    query = query.contains('tags', params.tags);
  }
  if (params.address) {
    query = query.ilike('address', `%${params.address}%`);
  }
  if (params.status) {
    query = query.eq('processing_status', params.status);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const rows = (data ?? []) as Pick<ImageRow, 'hash' | 'address' | 'tags' | 'processing_status' | 'upload_timestamp' | 'file_size_bytes' | 's3_key_prefix'>[];

  const summaries: ImageSummary[] = await Promise.all(
    rows.map(async (row) => {
      let thumbUrl: string | null = null;
      if (row.processing_status === 'ready') {
        thumbUrl = await generateDownloadUrl(`${row.s3_key_prefix}thumb.jpg`);
      }
      return {
        hash: row.hash,
        address: row.address,
        tags: row.tags,
        status: row.processing_status as ProcessingStatus,
        thumbUrl,
        uploadTimestamp: row.upload_timestamp,
        fileSizeBytes: row.file_size_bytes,
      };
    })
  );

  return { data: summaries, total: count ?? 0 };
}

export async function getImage(hash: string): Promise<ImageDetail | null> {
  const { data, error } = await supabase
    .from('images')
    .select(DETAIL_FIELDS)
    .eq('hash', hash)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as Pick<ImageRow, 'hash' | 'address' | 'tags' | 'processing_status' | 'upload_timestamp' | 'file_size_bytes' | 's3_key_prefix' | 'original_filename'>;

  let urls: ImageDetail['urls'] = { thumb: null, small: null, medium: null, large: null, original: null };
  if (row.processing_status === 'ready') {
    urls = await generateAllUrls(row.hash, row.original_filename);
  } else if (row.processing_status === 'pending' || row.processing_status === 'processing') {
    // Still processing — no JPGs available yet
  }

  return {
    hash: row.hash,
    address: row.address,
    tags: row.tags,
    status: row.processing_status as ProcessingStatus,
    thumbUrl: urls.thumb,
    uploadTimestamp: row.upload_timestamp,
    fileSizeBytes: row.file_size_bytes,
    originalFilename: row.original_filename,
    urls,
  };
}

export async function createImage(params: {
  hash: string;
  originalFilename: string;
  address: string;
  captureDate: string;
  sequenceNumber: string;
  s3KeyPrefix: string;
  fileSizeBytes: number;
  checksum: string;
  tags: string[];
}): Promise<void> {
  const { error } = await supabase.from('images').insert({
    hash: params.hash,
    original_filename: params.originalFilename,
    address: params.address,
    capture_date: params.captureDate,
    sequence_number: params.sequenceNumber,
    s3_key_prefix: params.s3KeyPrefix,
    file_size_bytes: params.fileSizeBytes,
    checksum: params.checksum,
    tags: params.tags,
    processing_status: 'pending',
  });
  if (error) throw error;
}

export async function updateImageStatus(hash: string, status: ProcessingStatus, error?: string): Promise<void> {
  const update: Record<string, unknown> = { processing_status: status };
  if (status === 'ready') update.processed_at = new Date().toISOString();
  if (error) update.processing_error = error;

  const { error: dbError } = await supabase
    .from('images')
    .update(update)
    .eq('hash', hash);

  if (dbError) throw dbError;
}

export async function updateTags(hash: string, tags: string[]): Promise<string[]> {
  const { data, error } = await supabase
    .from('images')
    .update({ tags })
    .eq('hash', hash)
    .select('tags')
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    const err = new Error('Image not found') as Error & { status: number };
    err.status = 404;
    throw err;
  }
  return data.tags;
}

export async function deleteImageRecord(hash: string): Promise<void> {
  const { error } = await supabase.from('images').delete().eq('hash', hash);
  if (error) throw error;
}

export async function deleteImageRecords(hashes: string[]): Promise<void> {
  if (hashes.length === 0) return;
  const { error } = await supabase.from('images').delete().in('hash', hashes);
  if (error) throw error;
}
