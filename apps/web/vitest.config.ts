import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@regcheck/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@regcheck/validators': path.resolve(__dirname, '../../packages/validators/src/index.ts'),
      '@regcheck/editor-engine': path.resolve(__dirname, '../../packages/editor-engine/src/index.ts'),
      '@regcheck/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
    },
  },
});
