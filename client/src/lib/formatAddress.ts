// Convert underscore-separated address to display form
// "Adalbert_Stifter_Gasse" → "Adalbert Stifter Gasse"
export function formatAddress(raw: string): string {
  return raw.replace(/_/g, ' ').trim();
}

// Truncate long addresses for compact display
export function shortAddress(address: string, maxLength = 40): string {
  if (address.length <= maxLength) return address;
  return address.slice(0, maxLength - 1) + '…';
}
