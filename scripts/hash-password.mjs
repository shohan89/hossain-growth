#!/usr/bin/env node
// Generates a password hash in the same `pbkdf2$<iterations>$<salt>$<hash>`
// format used by src/lib/auth/password.ts, for writing seed SQL by hand.
// Usage: node scripts/hash-password.mjs <password>

const PBKDF2_ITERATIONS = 600_000; // keep in sync with src/lib/auth/password.ts

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  const toB64 = (bytes) => Buffer.from(bytes).toString('base64');
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toB64(salt)}$${toB64(new Uint8Array(derived))}`;
}

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.mjs <password>');
  process.exit(1);
}

hashPassword(password).then((hash) => console.log(hash));
