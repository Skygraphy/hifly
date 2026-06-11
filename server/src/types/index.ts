export type UserRole = 'user' | 'admin' | 'super_admin';
export type ProcessingStatus = 'pending' | 'processing' | 'ready' | 'error';

// Internal DB status — 'uploaded' means DNG is in S3, worker can pick it up
export type DbProcessingStatus = ProcessingStatus | 'uploaded';

export interface ImageSummary {
  id: string;        // full filename without extension (primary key)
  hash: string;      // 4-char display/reference code
  main_location: string;
  secondary_locations: string[];
  tags: string[];
  user_tags: string[];
  web_visible: boolean;
  web_ranking: number;
  print_visible: boolean;
  print_ranking: number;
  lat: number | null;
  lng: number | null;
  status: ProcessingStatus;
  thumbUrl: string | null;
  uploadTimestamp: string;
  fileSizeBytes: number | null;
  isOwner: boolean;
  regionId: string | null;
  regionPath: string[];
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

export interface ImageRow {
  id: string;
  hash: string;
  original_filename: string;
  main_location: string;
  capture_date: string; // never sent to client
  sequence_number: string | null;
  s3_key_prefix: string;
  file_size_bytes: number | null;
  checksum: string;
  tags: string[];
  secondary_locations: string[];
  user_tags: string[];
  web_visible: boolean;
  web_ranking: number;
  print_visible: boolean;
  print_ranking: number;
  lat: number | null;
  lng: number | null;
  upload_timestamp: string;
  processing_status: DbProcessingStatus;
  processing_error: string | null;
  processed_at: string | null;
  uploaded_by: string | null;
  region_id: string | null;
  region_path: string[];
}

export interface UploadInitiateFile {
  filename: string;
  fileSize: number;
  checksum: string;
  tags?: string[];
}

export interface UploadInitiateResult {
  id: string;
  hash: string;
  isDuplicate: boolean;
  duplicateId?: string;
  presignedUrl?: string;
  s3Key?: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}
