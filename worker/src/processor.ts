import { spawnSync } from 'child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import sharp from 'sharp';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { uploadJpg } from './uploader';
import { setStatus } from './db';
import 'dotenv/config';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'eu-central-1' });
const BUCKET = process.env.S3_BUCKET!;

const JPG_VARIANTS = [
  { name: 'large',  width: 3000, height: undefined, fit: 'inside'  as const },
  { name: 'medium', width: 1200, height: undefined, fit: 'inside'  as const },
  { name: 'small',  width: 600,  height: undefined, fit: 'inside'  as const },
  { name: 'thumb',  width: 200,  height: 200,        fit: 'cover'   as const },
];

async function downloadDNG(s3Key: string): Promise<Buffer> {
  const { Body } = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }));
  if (!Body) throw new Error(`Empty response from S3 for key: ${s3Key}`);
  const chunks: Uint8Array[] = [];
  for await (const chunk of Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function convertDNGtoTIFF(dngPath: string): Buffer {
  // dcraw flags:
  //   -T  output TIFF
  //   -w  use camera white balance
  //   -b 2.0  brightness (slight boost for aerial photos)
  //   -c  write to stdout
  const result = spawnSync('dcraw', ['-T', '-w', '-b', '2.0', '-c', dngPath], {
    maxBuffer: 600 * 1024 * 1024, // 600 MB — uncompressed TIFF from 50MP can be ~300MB
    encoding: 'buffer',
  });

  if (result.status !== 0) {
    const stderr = result.stderr?.toString() ?? 'unknown error';
    throw new Error(`dcraw failed (exit ${result.status}): ${stderr}`);
  }
  if (!result.stdout || result.stdout.length === 0) {
    throw new Error('dcraw produced no output');
  }
  return result.stdout as Buffer;
}

async function generateJpgs(tiffBuffer: Buffer, hash: string, prefix: string): Promise<void> {
  await Promise.all(
    JPG_VARIANTS.map(async ({ name, width, height, fit }) => {
      const jpgBuffer = await sharp(tiffBuffer)
        .resize(width, height, { fit, withoutEnlargement: true })
        .jpeg({ quality: 88, mozjpeg: true })
        .toBuffer();

      await uploadJpg(`${prefix}${name}.jpg`, jpgBuffer);
      console.log(`  ✓ ${name}.jpg (${(jpgBuffer.length / 1024).toFixed(0)} KB) → ${hash}`);
    })
  );
}

export async function processImage(hash: string, s3KeyPrefix: string): Promise<void> {
  const dngKey = `${s3KeyPrefix}original.dng`;
  const tmpDir = mkdtempSync(join(tmpdir(), `hifly-${hash}-`));
  const dngPath = join(tmpDir, 'original.dng');

  try {
    await setStatus(hash, 'processing');
    console.log(`[${hash}] Downloading DNG from S3…`);

    const dngBuffer = await downloadDNG(dngKey);
    writeFileSync(dngPath, dngBuffer);
    console.log(`[${hash}] DNG downloaded (${(dngBuffer.length / 1024 / 1024).toFixed(1)} MB)`);

    console.log(`[${hash}] Converting DNG → TIFF via dcraw…`);
    const tiffBuffer = convertDNGtoTIFF(dngPath);
    console.log(`[${hash}] TIFF generated (${(tiffBuffer.length / 1024 / 1024).toFixed(1)} MB)`);

    console.log(`[${hash}] Generating JPG variants…`);
    await generateJpgs(tiffBuffer, hash, s3KeyPrefix);

    await setStatus(hash, 'ready');
    console.log(`[${hash}] Processing complete.`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[${hash}] Processing failed:`, msg);
    await setStatus(hash, 'error', msg).catch(() => {});
    throw err;
  } finally {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}
