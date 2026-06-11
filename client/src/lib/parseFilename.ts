// Parses: Adalbert_Stifter_Gasse_2024_07_13_001_7EE7.DNG
const FILENAME_RE = /^(.+)_(\d{4})_(\d{2})_(\d{2})_(\d+)_([A-Fa-f0-9]{4})\.DNG$/i;

export interface ParsedFilename {
  main_location: string; // "Adalbert Stifter Gasse"
  captureDate: string;   // "2024-07-13" — stored only, never shown
  sequenceNumber: string; // "001"
  hash: string;          // "7EE7"
}

export function parseFilename(filename: string): ParsedFilename | null {
  const m = filename.match(FILENAME_RE);
  if (!m) return null;
  return {
    main_location: m[1].replace(/_/g, ' '),
    captureDate: `${m[2]}-${m[3]}-${m[4]}`,
    sequenceNumber: m[5],
    hash: m[6].toUpperCase(),
  };
}

export function isValidDNGFilename(filename: string): boolean {
  return FILENAME_RE.test(filename);
}
