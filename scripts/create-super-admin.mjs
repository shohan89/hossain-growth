#!/usr/bin/env node
// Prints the SQL to provision the first Super Admin for a given
// environment. Never auto-executes against a remote database — printing
// (rather than running) keeps a human checkpoint before any real admin
// credential is created, and keeps this repo free of any baked-in default
// admin account.
//
// Usage:
//   node scripts/create-super-admin.mjs <email> <name>
//   (prompts for the password interactively — never pass it as an argv,
//   it would land in shell history)
//
// Then run the printed command yourself, e.g.:
//   npx wrangler d1 execute hossain-growth-production --remote --command "<printed SQL>"

import { createInterface } from 'node:readline';
import { randomUUID } from 'node:crypto';

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

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    // Minimal "hidden" input: readline on Windows/most terminals doesn't
    // support true masking without extra deps, so this just avoids echoing
    // the prompt label alongside; real terminals will still show typed
    // characters. Good enough for a one-time local provisioning step.
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

const [email, name] = process.argv.slice(2);
if (!email || !name) {
  console.error('Usage: node scripts/create-super-admin.mjs <email> <name>');
  process.exit(1);
}

const password = await promptHidden('Super Admin password (min 12 chars): ');
if (password.length < 12) {
  console.error('Password must be at least 12 characters.');
  process.exit(1);
}

const passwordHash = await hashPassword(password);
const id = randomUUID();

const sql = `INSERT INTO admin_users (id, email, password_hash, name, role_id, is_active) VALUES ('${id}', '${email.toLowerCase().replace(/'/g, "''")}', '${passwordHash}', '${name.replace(/'/g, "''")}', (SELECT id FROM roles WHERE key = 'super_admin'), 1);`;

console.log('\nGenerated SQL (does NOT run automatically):\n');
console.log(sql);
console.log('\nRun it yourself against the target environment, e.g.:\n');
console.log(
  `  npx wrangler d1 execute hossain-growth-production --remote --command "${sql.replace(/"/g, '\\"')}"\n`,
);
console.log('Never commit this output or paste it anywhere other than your own terminal.');
