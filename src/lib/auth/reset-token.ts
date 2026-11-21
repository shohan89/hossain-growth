const RESET_TOKEN_TTL_SECONDS = 30 * 60;
const TOKEN_BYTES = 32;

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** High-entropy random token. The raw value is only ever returned once (to the requester); only its hash is stored. */
export function generateResetToken(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(TOKEN_BYTES)));
}

/** SHA-256 is appropriate here (unlike for passwords) — the input is already high-entropy random data, not a low-entropy secret guessable by brute force. */
export async function hashResetToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return toBase64Url(new Uint8Array(digest));
}

export { RESET_TOKEN_TTL_SECONDS };
