/**
 * Web Worker: image preprocessing for OCR.
 * Runs grayscale, contrast enhancement, and binarization OFF the main thread.
 */

/// <reference lib="webworker" />
/// <reference lib="es2022" />

interface PreprocessParams {
  threshold?: number;
  contrast?: number;
}

interface WorkerRequest {
  type: 'preprocess';
  imageData: { data: Uint8ClampedArray; width: number; height: number };
  params: PreprocessParams;
}

interface WorkerResponse {
  type: 'preprocess-result';
  imageData: { data: Uint8ClampedArray; width: number; height: number };
}

function preprocess(
  pixels: Uint8ClampedArray,
  contrast: number,
  thresholdOverride: number | undefined,
): Uint8ClampedArray {
  // Step 1: Grayscale
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = (pixels[i]! * 0.299) + (pixels[i + 1]! * 0.587) + (pixels[i + 2]! * 0.114);
    pixels[i] = gray;
    pixels[i + 1] = gray;
    pixels[i + 2] = gray;
  }

  // Step 2: Contrast stretch
  let min = 255;
  let max = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const v = pixels[i]!;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min || 1;
  for (let i = 0; i < pixels.length; i += 4) {
    let val = ((pixels[i]! - min) / range) * 255;
    val = (val - 128) * contrast + 128;
    val = Math.max(0, Math.min(255, val));
    pixels[i] = val;
    pixels[i + 1] = val;
    pixels[i + 2] = val;
  }

  // Step 3: Binary threshold
  let sum = 0;
  const pixelCount = pixels.length / 4;
  for (let i = 0; i < pixels.length; i += 4) {
    sum += pixels[i]!;
  }
  const threshold = (thresholdOverride && thresholdOverride > 0)
    ? thresholdOverride
    : sum / pixelCount;

  for (let i = 0; i < pixels.length; i += 4) {
    const val = pixels[i]! > threshold ? 255 : 0;
    pixels[i] = val;
    pixels[i + 1] = val;
    pixels[i + 2] = val;
  }

  return pixels;
}

const _self = globalThis as unknown as { onmessage: ((e: { data: WorkerRequest }) => void) | null; postMessage: (msg: WorkerResponse, transfer: ArrayBuffer[]) => void };

_self.onmessage = (e: { data: WorkerRequest }) => {
  if (e.data.type === 'preprocess') {
    const { imageData, params } = e.data;
    const processed = preprocess(
      imageData.data,
      params.contrast ?? 1.0,
      params.threshold,
    );
    _self.postMessage(
      {
        type: 'preprocess-result',
        imageData: { data: processed, width: imageData.width, height: imageData.height },
      },
      [processed.buffer as ArrayBuffer],
    );
  }
};
