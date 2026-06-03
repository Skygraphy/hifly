import { supabase } from '../config/supabase';
import { generateDownloadUrl, generateAllUrls } from './s3.service';
import type { ImageRow, ImageSummary, ImageDetail, ProcessingStatus, DbProcessingStatus } from '../types';

// capture_date is excluded from all SELECT queries intentionally
const SUMMARY_FIELDS = 'id, hash, address, tags, processing_status, upload_timestamp, file_size_bytes, s3_key_prefix';
const DETAIL_FIELDS = `${SUMMARY_FIELDS}, original_filename`;

export interface ListParams {
  tags?: string[];
  address?: string;
  status?: ProcessingStatus;
  page: number;
  limit: number;
}

function toClientStatus(dbStatus: string): ProcessingStatus {
  return (dbStatus === 'uploaded' ? 'pending' : dbStatus) as ProcessingStatus;
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

  type SummaryRow = Pick<ImageRow, 'id' | 'hash' | 'address' | 'tags' | 'processing_status' | 'upload_timestamp' | 'file_size_bytes' | 's3_key_prefix'>;
  const rows = (data ?? []) as SummaryRow[];

  const summaries: ImageSummary[] = await Promise.all(
    rows.map(async (row) => {
      let thumbUrl: string | null = null;
      if (row.processing_status === 'ready') {
        thumbUrl = await generateDownloadUrl(`${row.s3_key_prefix}thumb.jpg`);
      }
      return {
        id: row.id,
        hash: row.hash,
        address: row.address,
        tags: row.tags,
        status: toClientStatus(row.processing_status),
        thumbUrl,
        uploadTimestamp: row.upload_timestamp,
        fileSizeBytes: row.file_size_bytes,
      };
    })
  );

  return { data: summaries, total: count ?? 0 };
}

export async function getImage(id: string): Promise<ImageDetail | null> {
  const { data, error } = await supabase
    .from('images')
    .select(DETAIL_FIELDS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  type DetailRow = Pick<ImageRow, 'id' | 'hash' | 'address' | 'tags' | 'processing_status' | 'upload_timestamp' | 'file_size_bytes' | 's3_key_prefix' | 'original_filename'>;
  const row = data as DetailRow;

  let urls: ImageDetail['urls'] = { thumb: null, small: null, medium: null, large: null, original: null };
  if (row.processing_status === 'ready') {
    urls = await generateAllUrls(row.s3_key_prefix, row.original_filename);
  }

  return {
    id: row.id,
    hash: row.hash,
    address: row.address,
    tags: row.tags,
    status: toClientStatus(row.processing_status),
    thumbUrl: urls.thumb,
    uploadTimestamp: row.upload_timestamp,
    fileSizeBytes: row.file_size_bytes,
    originalFilename: row.original_filename,
    urls,
  };
}

export async function createImage(params: {
  id: string;
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
    id: params.id,
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

export async function updateImageStatus(id: string, status: DbProcessingStatus, errorMsg?: string): Promise<void> {
  const update: Record<string, unknown> = { processing_status: status };
  if (status === 'ready') update.processed_at = new Date().toISOString();
  if (errorMsg) update.processing_error = errorMsg;

  const { error } = await supabase.from('images').update(update).eq('id', id);
  if (error) throw error;
}

export async function updateTags(id: string, tags: string[]): Promise<string[]> {
  const { data, error } = await supabase
    .from('images')
    .update({ tags })
    .eq('id', id)
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

export async function deleteImageRecord(id: string): Promise<void> {
  const { error } = await supabase.from('images').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteImageRecords(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('images').delete().in('id', ids);
  if (error) throw error;
}

export async function getS3Prefix(id: string): Promise<string | null> {
  const { data } = await supabase
    .from('images')
    .select('s3_key_prefix')
    .eq('id', id)
    .maybeSingle();
  return data?.s3_key_prefix ?? null;
}

export async function getS3Prefixes(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from('images')
    .select('s3_key_prefix')
    .in('id', ids);
  return (data ?? []).map((r: { s3_key_prefix: string }) => r.s3_key_prefix);
}
