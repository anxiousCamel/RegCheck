// Global test setup
// Polyfills for jsdom environment

// OffscreenCanvas stub
if (typeof OffscreenCanvas === 'undefined') {
  class OffscreenCanvasStub {
    width: number;
    height: number;
    private _ctx: CanvasRenderingContext2D | null = null;

    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
    }

    getContext(type: string) {
      if (type === '2d') {
        return {
          drawImage: vi.fn(),
          getImageData: vi.fn(() => ({
            data: new Uint8ClampedArray(this.width * this.height * 4),
            width: this.width,
            height: this.height,
          })),
          putImageData: vi.fn(),
        };
      }
      return null;
    }

    convertToBlob() {
      return Promise.resolve(new Blob());
    }
  }
  (globalThis as unknown as Record<string, unknown>).OffscreenCanvas = OffscreenCanvasStub;
}

// createImageBitmap stub
if (typeof createImageBitmap === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).createImageBitmap = vi.fn(async (source: { width?: number; height?: number }) => ({
    width: source?.width ?? 100,
    height: source?.height ?? 100,
    close: vi.fn(),
  }));
}

// performance.now stub
if (typeof performance === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).performance = { now: () => Date.now() };
}

// IDBFactory stub (IndexedDB)
if (typeof indexedDB === 'undefined') {
  const store = new Map<string, unknown>();
  const mockDb = {
    transaction: vi.fn(() => {
      const tx = {
        objectStore: vi.fn(() => ({
          get: vi.fn((key: string) => {
            const req = {
              result: store.get(key),
              onsuccess: null as ((e: unknown) => void) | null,
              onerror: null,
            };
            Promise.resolve().then(() => req.onsuccess?.({ target: req }));
            return req;
          }),
          put: vi.fn((val: unknown) => {
            const entry = val as { hash: string };
            store.set(entry.hash, val);
            return {};
          }),
          delete: vi.fn((key: string) => { store.delete(key); return {}; }),
        })),
        oncomplete: null as (() => void) | null,
        onerror: null,
      };
      Promise.resolve().then(() => tx.oncomplete?.());
      return tx;
    }),
    objectStoreNames: { contains: vi.fn(() => true) },
    createObjectStore: vi.fn(),
  };

  (globalThis as unknown as Record<string, unknown>).indexedDB = {
    open: vi.fn(() => {
      const req = {
        result: mockDb,
        onsuccess: null as ((e: unknown) => void) | null,
        onerror: null,
        onupgradeneeded: null,
      };
      Promise.resolve().then(() => req.onsuccess?.({ target: req }));
      return req;
    }),
  };
}

// ImageData polyfill for jsdom
if (typeof ImageData === 'undefined') {
  class ImageDataPolyfill {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    constructor(data: Uint8ClampedArray | number, width: number, height?: number) {
      if (typeof data === 'number') {
        this.width = data;
        this.height = width;
        this.data = new Uint8ClampedArray(data * width * 4);
      } else {
        this.data = data;
        this.width = width;
        this.height = height ?? data.length / (width * 4);
      }
    }
  }
  (globalThis as unknown as Record<string, unknown>).ImageData = ImageDataPolyfill;
}
