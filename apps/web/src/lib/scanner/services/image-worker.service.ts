/**
 * Manages the preprocessing Web Worker.
 * Sends ImageData off main thread, receives processed ImageData back.
 */

import type { PreprocessParams } from '../types';

interface WorkerResponse {
  type: 'preprocess-result';
  imageData: { data: Uint8ClampedArray; width: number; height: number };
}

let worker: Worker | null = null;
let workerReady = false;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../workers/preprocess.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerReady = true;
  }
  return worker;
}

export const ImageWorkerService = {
  /** Preprocess image data in a Web Worker. Returns processed ImageData. */
  process(
    imageData: ImageData,
    params: PreprocessParams,
    signal?: AbortSignal,
  ): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('Cancelled', 'AbortError'));
        return;
      }

      let w: Worker;
      try {
        w = getWorker();
      } catch {
        // Worker failed to construct (e.g. mobile with cross-origin asset URL).
        // Fall back to main-thread preprocessing.
        resolve(preprocessMainThread(imageData, params));
        return;
      }

      const onAbort = () => {
        w.removeEventListener('message', onMessage);
        reject(new DOMException('Cancelled', 'AbortError'));
      };

      const onMessage = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.type === 'preprocess-result') {
          signal?.removeEventListener('abort', onAbort);
          const { data, width, height } = e.data.imageData;
          resolve(new ImageData(new Uint8ClampedArray(data), width, height));
        }
      };

      signal?.addEventListener('abort', onAbort, { once: true });
      w.addEventListener('message', onMessage, { once: true });

      // Transfer buffer for zero-copy
      const transferData = new Uint8ClampedArray(imageData.data);
      w.postMessage(
        {
          type: 'preprocess',
          imageData: { data: transferData, width: imageData.width, height: imageData.height },
          params,
        },
        [transferData.buffer],
      );
    });
  },

  terminate(): void {
    if (worker) {
      worker.terminate();
      worker = null;
      workerReady = false;
    }
  },

  get isReady(): boolean {
    return workerReady;
  },
};

/** Fallback: runs the same preprocessing logic on the main thread. */
function preprocessMainThread(imageData: ImageData, params: PreprocessParams): ImageData {
  const pixels = new Uint8ClampedArray(imageData.data);
  const contrast = params.contrast ?? 1.0;
  const thresholdOverride = params.threshold;

  // Grayscale
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = pixels[i]! * 0.299 + pixels[i + 1]! * 0.587 + pixels[i + 2]! * 0.114;
    pixels[i] = gray;
    pixels[i + 1] = gray;
    pixels[i + 2] = gray;
  }

  // Contrast stretch
  let min = 255,
    max = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const v = pixels[i]!;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min || 1;
  for (let i = 0; i < pixels.length; i += 4) {
    let val = ((pixels[i]! - min) / range) * 255;
    val = (val - 128) * contrast + 128;
    pixels[i] = Math.max(0, Math.min(255, val));
    pixels[i + 1] = pixels[i]!;
    pixels[i + 2] = pixels[i]!;
  }

  // Binary threshold
  let sum = 0;
  for (let i = 0; i < pixels.length; i += 4) sum += pixels[i]!;
  const threshold =
    thresholdOverride && thresholdOverride > 0 ? thresholdOverride : sum / (pixels.length / 4);
  for (let i = 0; i < pixels.length; i += 4) {
    const val = pixels[i]! > threshold ? 255 : 0;
    pixels[i] = val;
    pixels[i + 1] = val;
    pixels[i + 2] = val;
  }

  return new ImageData(pixels, imageData.width, imageData.height);
}
