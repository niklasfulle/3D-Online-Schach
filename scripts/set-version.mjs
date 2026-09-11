import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const version = process.argv[2];
const versionFile = fileURLToPath(new URL('../packages/shared/src/version.ts', import.meta.url));

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Usage: pnpm version:set <major.minor.patch>');
  process.exit(1);
}

const source = await readFile(versionFile, 'utf8');
const updated = source.replace(
  /export const APP_VERSION = '[^']+';/,
  `export const APP_VERSION = '${version}';`,
);

if (!source.match(/export const APP_VERSION = '[^']+';/)) {
  throw new Error(`Could not update ${path.relative(process.cwd(), versionFile)}`);
}

if (source !== updated) await writeFile(versionFile, updated, 'utf8');
console.log(`Application version set to ${version}`);
