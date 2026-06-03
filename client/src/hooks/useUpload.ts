import { useCallback } from 'react';
import { useUploadStore, getMergedTags } from '../stores/uploadStore';
import { sha256File } from '../lib/checksum';
import { initiateUpload, confirmUpload, uploadToS3, fetchImage } from '../api/images';

const POLL_INTERVAL = 3000;
const POLL_MAX = 100;

export function useUpload() {
  const { files, batchTags, updateFile } = useUploadStore();

  const startUpload = useCallback(async () => {
    const queuedFiles = files.filter((f) => f.status === 'queued');
    if (queuedFiles.length === 0) return;

    // Step 1: compute checksums
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
    // Read batchTags fresh from store to avoid stale closure
    const currentBatchTags = useUploadStore.getState().batchTags;
    const initiatePayload = withChecksum.map((f) => ({
      filename: f.file.name,
      fileSize: f.file.size,
      checksum: f.checksum!,
      tags: getMergedTags(f, currentBatchTags),
    }));
    console.log('[upload] tags per file:', initiatePayload.map(p => `${p.filename}: [${p.tags.join(',')}]`));

    let results;
    try {
      results = await initiateUpload(initiatePayload);
    } catch {
      withChecksum.forEach((f) =>
        updateFile(f.id, { status: 'error', error: 'Upload-Initialisierung fehlgeschlagen' })
      );
      return;
    }

    // Step 3: upload each file to S3
    await Promise.all(
      withChecksum.map(async (f, i) => {
        const result = results[i];
        if (!result) return;

        if (result.isDuplicate) {
          updateFile(f.id, { status: 'duplicate', duplicateId: result.duplicateId });
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
          await confirmUpload(result.id, result.s3Key);
          updateFile(f.id, { status: 'processing', progress: 100 });
          pollUntilReady(result.id, f.id, updateFile);
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
  imageId: string,
  fileId: string,
  updateFile: (id: string, patch: object) => void
) {
  for (let i = 0; i < POLL_MAX; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    try {
      const image = await fetchImage(imageId);
      if (image.status === 'ready') {
        updateFile(fileId, { status: 'done' });
        return;
      }
      if (image.status === 'error') {
        updateFile(fileId, { status: 'error', error: 'Bildverarbeitung fehlgeschlagen' });
        return;
      }
    } catch {
      // keep polling on network hiccup
    }
  }
  updateFile(fileId, { status: 'error', error: 'Timeout: Bildverarbeitung dauert zu lange' });
}
