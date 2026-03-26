import { copyFileSync } from 'node:fs';

const src = 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs';
const dst = 'public/pdf.worker.min.mjs';

try {
  copyFileSync(src, dst);
} catch {
  // file may not exist in CI or before install — safe to ignore
}
