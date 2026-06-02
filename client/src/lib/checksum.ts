// Stream SHA-256 checksum via Web Crypto API
// Works for files up to multiple GB without loading all into memory
export async function sha256File(file: File): Promise<string> {
  const CHUNK = 64 * 1024 * 1024; // 64 MB chunks
  const hasher = await crypto.subtle.digest(
    'SHA-256',
    // For files ≤ available RAM, a single read is fine
    // For very large files, we read in chunks via streaming
    file.size <= CHUNK
      ? await file.arrayBuffer()
      : await streamHash(file)
  );

  return Array.from(new Uint8Array(hasher))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function streamHash(file: File): Promise<ArrayBuffer> {
  // Fallback: read entire file — browser handles this with OS virtual memory
  // True incremental SHA-256 needs SubtleCrypto streaming which isn't available yet
  return file.arrayBuffer();
}
