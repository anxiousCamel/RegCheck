import { describe, it, expect } from 'vitest';
import { ImageHashService } from '@/lib/scanner/services/image-hash.service';

function makeImageBitmap(width = 100, height = 100): ImageBitmap {
  return { width, height, close: () => {} } as unknown as ImageBitmap;
}

describe('ImageHashService', () => {
  describe('generate', () => {
    it('returns a hex string of 16 chars', async () => {
      const bitmap = makeImageBitmap();
      const hash = await ImageHashService.generate(bitmap);
      expect(typeof hash).toBe('string');
      expect(hash).toHaveLength(16);
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });

    it('returns consistent hash for same image data', async () => {
      const bitmap = makeImageBitmap();
      const h1 = await ImageHashService.generate(bitmap);
      const h2 = await ImageHashService.generate(bitmap);
      expect(h1).toBe(h2);
    });
  });

  describe('distance', () => {
    it('returns 0 for identical hashes', () => {
      expect(ImageHashService.distance('abcdef1234567890', 'abcdef1234567890')).toBe(0);
    });

    it('returns Infinity for hashes of different length', () => {
      expect(ImageHashService.distance('abc', 'abcd')).toBe(Infinity);
    });

    it('returns positive distance for different hashes', () => {
      const d = ImageHashService.distance('0000000000000000', 'ffffffffffffffff');
      expect(d).toBeGreaterThan(0);
    });

    it('distance is symmetric', () => {
      const a = 'abcdef1234567890';
      const b = '1234567890abcdef';
      expect(ImageHashService.distance(a, b)).toBe(ImageHashService.distance(b, a));
    });
  });
});
