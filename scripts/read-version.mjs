import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const versionFile = fileURLToPath(new URL('../packages/shared/src/version.ts', import.meta.url));
const source = await readFile(versionFile, 'utf8');
const match = source.match(/export const APP_VERSION = '([^']+)';/);

if (!match || !/^\d+\.\d+\.\d+$/.test(match[1])) {
  throw new Error('Could not read a valid application version.');
}

console.log(match[1]);
