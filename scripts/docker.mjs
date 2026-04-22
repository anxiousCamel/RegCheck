#!/usr/bin/env node
/**
 * Cross-platform docker compose wrapper.
 * Usage: node scripts/docker.mjs <...docker compose args>
 */
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);

const result = spawnSync('docker', args, { stdio: 'inherit', shell: true });

if (result.error) {
  console.error(`Failed to run: docker ${args.join(' ')}`);
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
