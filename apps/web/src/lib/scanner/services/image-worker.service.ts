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
    worker = new Worker(
      new URL('../workers/preprocess.worker.ts', import.meta.url),
      { type: 'module' },
    );
    workerReady = true;
  }
  return worker;
}

export const ImageWorkerService = {
  /** Preprocess image data in a Web Worker. Returns processed ImageData. */
  process(imageData: ImageData, params: PreprocessParams, signal?: AbortSignal): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('Cancelled', 'AbortError'));
        return;
      }

      const w = getWorker();

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
