/**
 * Perceptual image hash (dHash) for cache keying.
 * Tolerates small camera variations between captures.
 */

const HASH_SIZE = 8; // 8x9 → 64-bit hash

export const ImageHashService = {
  /** Generate a perceptual hash from an ImageBitmap. */
  async generate(image: ImageBitmap): Promise<string> {
    const w = HASH_SIZE + 1;
    const h = HASH_SIZE;

    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0, w, h);

    const { data } = ctx.getImageData(0, 0, w, h);

    // Convert to grayscale values
    const gray: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      gray.push((data[i] ?? 0) * 0.299 + (data[i + 1] ?? 0) * 0.587 + (data[i + 2] ?? 0) * 0.114);
    }

    // dHash: compare adjacent pixels in each row
    let hash = '';
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < HASH_SIZE; x++) {
        const left = gray[y * w + x] ?? 0;
        const right = gray[y * w + x + 1] ?? 0;
        hash += left < right ? '1' : '0';
      }
    }

    // Convert binary string to hex
    let hex = '';
    for (let i = 0; i < hash.length; i += 4) {
      hex += parseInt(hash.substring(i, i + 4), 2).toString(16);
    }

    return hex;
  },

  /** Hamming distance between two hashes (0 = identical). */
  distance(a: string, b: string): number {
    if (a.length !== b.length) return Infinity;
    let dist = 0;
    for (let i = 0; i < a.length; i++) {
      const xor = parseInt(a[i] ?? '0', 16) ^ parseInt(b[i] ?? '0', 16);
      dist += ((xor >> 3) & 1) + ((xor >> 2) & 1) + ((xor >> 1) & 1) + (xor & 1);
    }
    return dist;
  },
};
