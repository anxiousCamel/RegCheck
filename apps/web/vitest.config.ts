import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/scanner/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@regcheck/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@regcheck/validators': path.resolve(__dirname, '../../packages/validators/src/index.ts'),
      '@regcheck/editor-engine': path.resolve(__dirname, '../../packages/editor-engine/src/index.ts'),
      '@regcheck/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
    },
  },
});
