import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import 'dotenv/config';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'eu-central-1' });
const BUCKET = process.env.S3_BUCKET!;

export async function uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<void> {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
}

export async function uploadJpg(key: string, buffer: Buffer): Promise<void> {
  return uploadBuffer(key, buffer, 'image/jpeg');
}
