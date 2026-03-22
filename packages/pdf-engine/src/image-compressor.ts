import sharp from 'sharp';

/** Options for image compression */
interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

const DEFAULT_OPTIONS: Required<CompressOptions> = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 80,
  format: 'jpeg',
};

/**
 * Compresses and resizes images for storage efficiency.
 * Used for uploaded images and signature captures.
 */
export class ImageCompressor {
  /**
   * Compress an image buffer.
   * @param input - Raw image bytes
   * @param options - Compression options
   * @returns Compressed image bytes
   */
  static async compress(input: Buffer, options?: CompressOptions): Promise<Buffer> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    let pipeline = sharp(input).resize(opts.maxWidth, opts.maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });

    switch (opts.format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality: opts.quality });
        break;
      case 'png':
        pipeline = pipeline.png({ quality: opts.quality });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality: opts.quality });
        break;
    }

    return pipeline.toBuffer();
  }

  /**
   * Compress a signature (typically a PNG with transparency).
   * Keeps PNG format to preserve transparency.
   */
  static async compressSignature(input: Buffer): Promise<Buffer> {
    return this.compress(input, {
      maxWidth: 600,
      maxHeight: 300,
      quality: 90,
      format: 'png',
    });
  }
}
