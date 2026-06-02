import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '../config/s3';
import { env } from '../config/env';

const UPLOAD_TTL = 3600;    // 1 hour for presigned PUT
const DOWNLOAD_TTL = 3600;  // 1 hour for presigned GET

export async function generateUploadUrl(s3Key: string, contentType = 'image/x-adobe-dng'): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: s3Key,
    ContentType: contentType,
  });
  return getSignedUrl(s3Client, cmd, { expiresIn: UPLOAD_TTL });
}

export async function generateDownloadUrl(s3Key: string, downloadFilename?: string): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: s3Key,
    ResponseContentDisposition: downloadFilename
      ? `attachment; filename="${downloadFilename}"`
      : undefined,
  });
  return getSignedUrl(s3Client, cmd, { expiresIn: DOWNLOAD_TTL });
}

export async function generateAllUrls(hash: string, originalFilename: string): Promise<{
  thumb: string;
  small: string;
  medium: string;
  large: string;
  original: string;
}> {
  const prefix = `images/${hash}`;
  const [thumb, small, medium, large, original] = await Promise.all([
    generateDownloadUrl(`${prefix}/thumb.jpg`),
    generateDownloadUrl(`${prefix}/small.jpg`),
    generateDownloadUrl(`${prefix}/medium.jpg`),
    generateDownloadUrl(`${prefix}/large.jpg`),
    generateDownloadUrl(`${prefix}/original.dng`, originalFilename),
  ]);
  return { thumb, small, medium, large, original };
}

export async function deleteImage(hash: string): Promise<void> {
  const keys = [
    `images/${hash}/original.dng`,
    `images/${hash}/thumb.jpg`,
    `images/${hash}/small.jpg`,
    `images/${hash}/medium.jpg`,
    `images/${hash}/large.jpg`,
  ];

  await s3Client.send(new DeleteObjectsCommand({
    Bucket: env.S3_BUCKET,
    Delete: {
      Objects: keys.map((Key) => ({ Key })),
      Quiet: true,
    },
  }));
}

export async function deleteImages(hashes: string[]): Promise<void> {
  if (hashes.length === 0) return;

  const keys = hashes.flatMap((hash) => [
    `images/${hash}/original.dng`,
    `images/${hash}/thumb.jpg`,
    `images/${hash}/small.jpg`,
    `images/${hash}/medium.jpg`,
    `images/${hash}/large.jpg`,
  ]);

  // DeleteObjects supports max 1000 keys per request
  for (let i = 0; i < keys.length; i += 1000) {
    await s3Client.send(new DeleteObjectsCommand({
      Bucket: env.S3_BUCKET,
      Delete: {
        Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })),
        Quiet: true,
      },
    }));
  }
}
