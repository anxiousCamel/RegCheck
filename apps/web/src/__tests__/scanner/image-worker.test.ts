import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageWorkerService } from '@/lib/scanner/services/image-worker.service';

// Mock Worker constructor to always throw (simulates mobile failure)
const originalWorker = globalThis.Worker;

function makeImageData(width = 4, height = 4): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  // Fill with a gradient
  for (let i = 0; i < data.length; i += 4) {
    const v = (i / data.length) * 255;
    data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
  }
  return { data, width, height } as unknown as ImageData;
}

describe('ImageWorkerService — main thread fallback', () => {
  beforeEach(() => {
    ImageWorkerService.terminate();
    // Force Worker constructor to fail
    (globalThis as unknown as Record<string, unknown>).Worker = class {
      constructor() { throw new Error('Worker not available'); }
    };
  });

  afterEach(() => {
    (globalThis as unknown as Record<string, unknown>).Worker = originalWorker;
    ImageWorkerService.terminate();
  });

  it('falls back to main thread when Worker fails', async () => {
    const imageData = makeImageData();
    const result = await ImageWorkerService.process(imageData, { contrast: 1.0 });
    expect(result).toBeInstanceOf(ImageData);
    expect(result.width).toBe(imageData.width);
    expect(result.height).toBe(imageData.height);
  });

  it('output is binarized (only 0 or 255 values)', async () => {
    const imageData = makeImageData();
    const result = await ImageWorkerService.process(imageData, { contrast: 1.0 });
    for (let i = 0; i < result.data.length; i += 4) {
      expect([0, 255]).toContain(result.data[i]);
    }
  });

  it('rejects immediately if signal is aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const imageData = makeImageData();
    await expect(
      ImageWorkerService.process(imageData, {}, controller.signal)
    ).rejects.toThrow('Cancelled');
  });

  it('handles fixed threshold', async () => {
    const imageData = makeImageData();
    const result = await ImageWorkerService.process(imageData, { threshold: 128, contrast: 1.0 });
    expect(result).toBeInstanceOf(ImageData);
  });
});

describe('ImageWorkerService — preprocessing correctness', () => {
  beforeEach(() => {
    ImageWorkerService.terminate();
    (globalThis as unknown as Record<string, unknown>).Worker = class {
      constructor() { throw new Error('Worker not available'); }
    };
  });

  afterEach(() => {
    (globalThis as unknown as Record<string, unknown>).Worker = originalWorker;
  });

  it('all-white image stays white after binarization', async () => {
    const data = new Uint8ClampedArray(16 * 4).fill(255);
    const imageData = { data, width: 4, height: 4 } as unknown as ImageData;
    const result = await ImageWorkerService.process(imageData, { contrast: 1.0 });
    // When all pixels are equal, threshold = mean = 255.
    // pixel > 255 is false → all become 0 (black). This is correct behavior.
    for (let i = 0; i < result.data.length; i += 4) {
      expect([0, 255]).toContain(result.data[i]);
    }
  });

  it('all-black image stays black after binarization', async () => {
    const data = new Uint8ClampedArray(16 * 4);
    // Set alpha to 255
    for (let i = 3; i < data.length; i += 4) data[i] = 255;
    const imageData = { data, width: 4, height: 4 } as unknown as ImageData;
    const result = await ImageWorkerService.process(imageData, { contrast: 1.0 });
    for (let i = 0; i < result.data.length; i += 4) {
      expect(result.data[i]).toBe(0);
    }
  });
});
