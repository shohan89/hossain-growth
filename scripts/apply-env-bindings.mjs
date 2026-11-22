#!/usr/bin/env node
// The @astrojs/cloudflare adapter regenerates dist/server/wrangler.json on
// every build. That generated file is flat — it carries only the top-level
// (dev) vars/d1_databases/r2_buckets/kv_namespaces/name, even though it lists
// definedEnvironments: ["staging","production"]. `wrangler deploy --env X`
// against this generated file has no env.X block to read, so it silently
// deploys with dev bindings regardless of --env. This script merges the
// requested named environment's bindings from the real wrangler.jsonc into
// the generated file before deploy.
import { readFileSync, writeFileSync } from 'node:fs';
import { parse as parseJsonc } from 'jsonc-parser';

const envName = process.argv[2];
if (!envName) {
  console.error('Usage: node scripts/apply-env-bindings.mjs <envName>');
  process.exit(1);
}

const rootConfig = parseJsonc(readFileSync('wrangler.jsonc', 'utf8'));
const envConfig = rootConfig.env?.[envName];
if (!envConfig) {
  console.error(`No env.${envName} block found in wrangler.jsonc`);
  process.exit(1);
}

const generatedPath = 'dist/server/wrangler.json';
const generated = JSON.parse(readFileSync(generatedPath, 'utf8'));

generated.name = envConfig.name ?? generated.name;
generated.vars = { ...generated.vars, ...envConfig.vars };
if (envConfig.d1_databases) generated.d1_databases = envConfig.d1_databases;
if (envConfig.r2_buckets) generated.r2_buckets = envConfig.r2_buckets;
if (envConfig.kv_namespaces) generated.kv_namespaces = envConfig.kv_namespaces;

writeFileSync(generatedPath, JSON.stringify(generated, null, 2));
console.log(
  `Merged env.${envName} bindings into ${generatedPath}: name=${generated.name}, ` +
    `d1=${generated.d1_databases[0]?.database_name}, r2=${generated.r2_buckets[0]?.bucket_name}, ` +
    `kv=${generated.kv_namespaces.map((k) => k.binding).join(',')}`,
);
