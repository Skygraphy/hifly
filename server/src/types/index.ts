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

export interface ImageRow {
  hash: string;
  original_filename: string;
  address: string;
  capture_date: string; // never sent to client
  sequence_number: string | null;
  s3_key_prefix: string;
  file_size_bytes: number | null;
  checksum: string;
  tags: string[];
  upload_timestamp: string;
  processing_status: ProcessingStatus;
  processing_error: string | null;
  processed_at: string | null;
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

export interface AuthPayload {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}
