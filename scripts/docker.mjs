#!/usr/bin/env node
/**
 * Cross-platform docker compose wrapper.
 * - On Linux: runs docker compose directly
 * - On Windows (non-WSL): prefixes with `wsl --`
 *
 * Usage: node scripts/docker.mjs <...docker compose args>
 */
import { spawnSync } from 'node:child_process';

const isWindows = process.platform === 'win32';
const args = process.argv.slice(2);

const cmd = isWindows ? 'wsl' : 'docker';
const cmdArgs = isWindows ? ['--', 'docker', ...args] : args;

const result = spawnSync(cmd, cmdArgs, { stdio: 'inherit', shell: true });

if (result.error) {
  console.error(`Failed to run: ${cmd} ${cmdArgs.join(' ')}`);
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
