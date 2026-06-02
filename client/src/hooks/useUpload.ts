import { useCallback } from 'react';
import { useUploadStore, getMergedTags } from '../stores/uploadStore';
import { sha256File } from '../lib/checksum';
import { initiateUpload, confirmUpload, uploadToS3, fetchImage } from '../api/images';

const POLL_INTERVAL = 3000;
const POLL_MAX = 100; // 5 minutes

export function useUpload() {
  const { files, batchTags, updateFile } = useUploadStore();

  const startUpload = useCallback(async () => {
    // Step 1: compute checksums for all queued files
    const queuedFiles = files.filter((f) => f.status === 'queued');
    if (queuedFiles.length === 0) return;

    await Promise.all(
      queuedFiles.map(async (f) => {
        updateFile(f.id, { status: 'hashing' });
        try {
          const checksum = await sha256File(f.file);
          updateFile(f.id, { checksum });
        } catch {
          updateFile(f.id, { status: 'error', error: 'Fehler beim Berechnen der Prüfsumme' });
        }
      })
    );

    const withChecksum = useUploadStore
      .getState()
      .files.filter((f) => f.status === 'hashing' && f.checksum);

    if (withChecksum.length === 0) return;

    // Step 2: initiate upload batch
    const initiatePayload = withChecksum.map((f) => ({
      filename: f.file.name,
      fileSize: f.file.size,
      checksum: f.checksum!,
      tags: getMergedTags(f, batchTags),
    }));

    let results;
    try {
      results = await initiateUpload(initiatePayload);
    } catch (err) {
      withChecksum.forEach((f) =>
        updateFile(f.id, { status: 'error', error: 'Upload-Initialisierung fehlgeschlagen' })
      );
      return;
    }

    // Step 3: upload each non-duplicate file to S3
    await Promise.all(
      withChecksum.map(async (f, i) => {
        const result = results[i];
        if (!result) return;

        if (result.isDuplicate) {
          updateFile(f.id, { status: 'duplicate', duplicateHash: result.duplicateHash });
          return;
        }

        if (!result.presignedUrl || !result.s3Key) {
          updateFile(f.id, { status: 'error', error: 'Kein Upload-URL erhalten' });
          return;
        }

        updateFile(f.id, { status: 'uploading', progress: 0 });
        try {
          await uploadToS3(result.presignedUrl, f.file, (pct) =>
            updateFile(f.id, { progress: pct })
          );
          await confirmUpload(result.hash, result.s3Key);
          updateFile(f.id, { status: 'processing', progress: 100 });

          // Step 4: poll until processing_status === 'ready'
          pollUntilReady(result.hash, f.id, updateFile);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Upload fehlgeschlagen';
          updateFile(f.id, { status: 'error', error: msg });
        }
      })
    );
  }, [files, batchTags, updateFile]);

  return { startUpload };
}

async function pollUntilReady(
  hash: string,
  fileId: string,
  updateFile: (id: string, patch: object) => void
) {
  for (let i = 0; i < POLL_MAX; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    try {
      const image = await fetchImage(hash);
      if (image.status === 'ready') {
        updateFile(fileId, { status: 'done' });
        return;
      }
      if (image.status === 'error') {
        updateFile(fileId, { status: 'error', error: 'Bildverarbeitung fehlgeschlagen' });
        return;
      }
    } catch {
      // network hiccup — keep polling
    }
  }
  updateFile(fileId, { status: 'error', error: 'Timeout: Bildverarbeitung dauert zu lange' });
}
