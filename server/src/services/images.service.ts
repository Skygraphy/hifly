import { supabase } from '../config/supabase';
import { generateDownloadUrl, generateAllUrls } from './s3.service';
import { imageMap } from '../image_data/klosterneuburg_stadt';
import type { ImageRow, ImageSummary, ImageDetail, ProcessingStatus, DbProcessingStatus, AuthPayload } from '../types';

// capture_date is excluded from all SELECT queries intentionally
const SUMMARY_FIELDS = 'id, hash, main_location, secondary_locations, tags, user_tags, web_visible, web_ranking, print_visible, print_ranking, lat, lng, processing_status, upload_timestamp, file_size_bytes, s3_key_prefix, uploaded_by, region_id, region_path';
const DETAIL_FIELDS = `${SUMMARY_FIELDS}, original_filename`;

export interface ListParams {
  tags?: string[];
  main_location?: string;
  status?: ProcessingStatus;
  regionId?: string; // filter by region UUID (includes descendants via region_path_ids)
  page: number;
  limit: number;
}

function toClientStatus(dbStatus: string): ProcessingStatus {
  return (dbStatus === 'uploaded' ? 'pending' : dbStatus) as ProcessingStatus;
}

function canDownload(role?: string): boolean {
  return role === 'user' || role === 'admin' || role === 'super_admin';
}

function calcIsOwner(uploadedBy: string | null, user?: AuthPayload): boolean {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  return uploadedBy === user.userId;
}

/** Throws 403 if the requesting user is not allowed to modify this image. */
export async function assertCanModify(imageId: string, user: AuthPayload): Promise<void> {
  if (user.role === 'super_admin') return;
  const { data } = await supabase
    .from('images')
    .select('uploaded_by')
    .eq('id', imageId)
    .maybeSingle();
  if (!data || data.uploaded_by !== user.userId) {
    const err = Object.assign(new Error('Forbidden: you can only modify your own images'), { status: 403 });
    throw err;
  }
}

export async function listImages(params: ListParams, user?: AuthPayload): Promise<{ data: ImageSummary[]; total: number }> {
  const offset = (params.page - 1) * params.limit;

  let query = supabase
    .from('images')
    .select(SUMMARY_FIELDS, { count: 'exact' })
    .order('upload_timestamp', { ascending: false })
    .range(offset, offset + params.limit - 1);

  if (params.tags && params.tags.length > 0) {
    query = query.contains('tags', params.tags);
  }
  if (params.main_location) {
    query = query.ilike('main_location', `%${params.main_location}%`);
  }
  if (params.status) {
    query = query.eq('processing_status', params.status);
  }
  if (params.regionId) {
    query = query.contains('region_path_ids', [params.regionId]);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  type SummaryRow = Pick<ImageRow, 'id' | 'hash' | 'main_location' | 'secondary_locations' | 'tags' | 'user_tags' | 'web_visible' | 'web_ranking' | 'print_visible' | 'print_ranking' | 'lat' | 'lng' | 'processing_status' | 'upload_timestamp' | 'file_size_bytes' | 's3_key_prefix' | 'region_id' | 'region_path'> & { uploaded_by: string | null };
  const rows = (data ?? []) as SummaryRow[];

  const summaries: ImageSummary[] = await Promise.all(
    rows.map(async (row) => {
      const meta = imageMap.get(row.id.normalize('NFC'));
      let thumbUrl: string | null = null;
      if (row.processing_status === 'ready') {
        thumbUrl = await generateDownloadUrl(`${row.s3_key_prefix}thumb.jpg`);
      }
      return {
        id: row.id,
        hash: row.hash,
        main_location:       row.main_location       ?? meta?.main_location       ?? '',
        secondary_locations: row.secondary_locations ?? meta?.secondary_locations ?? [],
        tags:                row.tags,
        user_tags:           row.user_tags            ?? meta?.user_tags           ?? [],
        web_visible:         row.web_visible         ?? meta?.web_visible         ?? true,
        web_ranking:         row.web_ranking         ?? meta?.web_ranking         ?? 1,
        print_visible:       row.print_visible       ?? meta?.print_visible       ?? true,
        print_ranking:       row.print_ranking       ?? meta?.print_ranking       ?? 1,
        lat:                 row.lat                 ?? meta?.lat_lng?.[0]        ?? null,
        lng:                 row.lng                 ?? meta?.lat_lng?.[1]        ?? null,
        status: toClientStatus(row.processing_status),
        thumbUrl,
        uploadTimestamp: row.upload_timestamp,
        fileSizeBytes: row.file_size_bytes,
        isOwner: calcIsOwner(row.uploaded_by, user),
        regionId: row.region_id,
        regionPath: row.region_path ?? [],
      };
    })
  );

  return { data: summaries, total: count ?? 0 };
}

export async function getImage(id: string, user?: AuthPayload): Promise<ImageDetail | null> {
  const { data, error } = await supabase
    .from('images')
    .select(DETAIL_FIELDS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  type DetailRow = Pick<ImageRow, 'id' | 'hash' | 'main_location' | 'secondary_locations' | 'tags' | 'user_tags' | 'web_visible' | 'web_ranking' | 'print_visible' | 'print_ranking' | 'lat' | 'lng' | 'processing_status' | 'upload_timestamp' | 'file_size_bytes' | 's3_key_prefix' | 'original_filename' | 'region_id' | 'region_path'> & { uploaded_by: string | null };
  const row = data as DetailRow;
  const meta = imageMap.get(row.id);

  let urls: ImageDetail['urls'] = { thumb: null, small: null, medium: null, large: null, original: null };
  if (row.processing_status === 'ready' && canDownload(user?.role)) {
    urls = await generateAllUrls(row.s3_key_prefix, row.original_filename);
  } else if (row.processing_status === 'ready') {
    const thumb = await generateDownloadUrl(`${row.s3_key_prefix}thumb.jpg`);
    urls = { thumb, small: null, medium: null, large: null, original: null };
  }

  return {
    id: row.id,
    hash: row.hash,
    main_location:       row.main_location       ?? meta?.main_location       ?? '',
    secondary_locations: row.secondary_locations ?? meta?.secondary_locations ?? [],
    tags:                row.tags,
    user_tags:           row.user_tags            ?? meta?.user_tags           ?? [],
    web_visible:         row.web_visible         ?? meta?.web_visible         ?? true,
    web_ranking:         row.web_ranking         ?? meta?.web_ranking         ?? 1,
    print_visible:       row.print_visible       ?? meta?.print_visible       ?? true,
    print_ranking:       row.print_ranking       ?? meta?.print_ranking       ?? 1,
    lat:                 row.lat                 ?? meta?.lat_lng?.[0]        ?? null,
    lng:                 row.lng                 ?? meta?.lat_lng?.[1]        ?? null,
    status: toClientStatus(row.processing_status),
    thumbUrl: urls.thumb,
    uploadTimestamp: row.upload_timestamp,
    fileSizeBytes: row.file_size_bytes,
    originalFilename: row.original_filename,
    isOwner: calcIsOwner(row.uploaded_by, user),
    regionId: row.region_id,
    regionPath: row.region_path ?? [],
    urls,
  };
}

export async function setImageRegion(
  imageId: string,
  regionId: string | null,
  regionPath: string[],
  regionPathIds: string[],
): Promise<void> {
  const { error } = await supabase
    .from('images')
    .update({ region_id: regionId, region_path: regionPath, region_path_ids: regionPathIds })
    .eq('id', imageId);
  if (error) throw error;
}

export async function createImage(params: {
  id: string;
  hash: string;
  originalFilename: string;
  main_location: string;
  captureDate: string;
  sequenceNumber: string;
  s3KeyPrefix: string;
  fileSizeBytes: number;
  checksum: string;
  tags: string[];
  uploadedBy: string;
  regionId?: string | null;
  regionPath?: string[];
  regionPathIds?: string[];
}): Promise<void> {
  const { error } = await supabase.from('images').insert({
    id: params.id,
    hash: params.hash,
    original_filename: params.originalFilename,
    main_location: params.main_location,
    capture_date: params.captureDate,
    sequence_number: params.sequenceNumber,
    s3_key_prefix: params.s3KeyPrefix,
    file_size_bytes: params.fileSizeBytes,
    checksum: params.checksum,
    tags: params.tags,
    processing_status: 'pending',
    uploaded_by: params.uploadedBy,
    ...(params.regionId ? {
      region_id: params.regionId,
      region_path: params.regionPath ?? [],
      region_path_ids: params.regionPathIds ?? [],
    } : {}),
  });
  if (error) throw error;
}

export async function setImageRegionBulk(
  ids: string[],
  regionId: string | null,
  regionPath: string[],
  regionPathIds: string[],
): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from('images')
    .update({ region_id: regionId, region_path: regionPath, region_path_ids: regionPathIds })
    .in('id', ids);
  if (error) throw error;
}

export async function updateTagsBulk(
  ids: string[],
  tags: string[],
  mode: 'replace' | 'merge' = 'replace',
): Promise<void> {
  if (ids.length === 0) return;
  if (mode === 'replace') {
    const { error } = await supabase.from('images').update({ tags }).in('id', ids);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from('images').select('id, tags').in('id', ids);
    if (error) throw error;
    await Promise.all((data ?? []).map(async (row: { id: string; tags: string[] }) => {
      const merged = Array.from(new Set([...(row.tags ?? []), ...tags]));
      const { error: ue } = await supabase.from('images').update({ tags: merged }).eq('id', row.id);
      if (ue) throw ue;
    }));
  }
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
