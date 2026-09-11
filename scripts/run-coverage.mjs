import { existsSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vitestBinary = process.platform === 'win32' ? 'vitest.cmd' : 'vitest';
const workspaces = ['apps/client', 'apps/server', 'packages/chess-core', 'packages/shared'];

for (const workspace of workspaces) {
  const workspaceDir = path.resolve(rootDir, workspace);
  const localBinary = path.resolve(workspaceDir, 'node_modules', '.bin', vitestBinary);
  const fallbackBinary = path.resolve(rootDir, 'node_modules', '.bin', vitestBinary);
  const binary = existsSync(localBinary) ? localBinary : fallbackBinary;

  console.log(`\nRunning coverage for ${workspace}`);
  const result = spawnSync(
    binary,
    [
      'run',
      '--coverage',
      '--passWithNoTests',
      '--coverage.reporter=lcov',
      '--coverage.reporter=text',
    ],
    {
      cwd: workspaceDir,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    },
  );

  if (result.error) {
    console.error(`Could not start Vitest for ${workspace}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  const lcovFile = path.resolve(workspaceDir, 'coverage', 'lcov.info');
  if (!existsSync(lcovFile) || statSync(lcovFile).size === 0) {
    console.error(`Coverage completed without a usable LCOV report: ${lcovFile}`);
    process.exit(1);
  }

  console.log(`LCOV report: ${lcovFile}`);
}
