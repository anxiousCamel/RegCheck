/** Resizes image to target width before processing. Runs off main thread via OffscreenCanvas. */

const DEFAULT_MAX_WIDTH = 800;

export const ImageResizeService = {
  /** Resize an ImageBitmap. Returns a new ImageBitmap and a canvas for pixel access. */
  async resize(
    image: ImageBitmap,
    maxWidth = DEFAULT_MAX_WIDTH,
  ): Promise<{ bitmap: ImageBitmap; canvas: OffscreenCanvas }> {
    const scale = image.width > maxWidth ? maxWidth / image.width : 1;
    const w = Math.round(image.width * scale);
    const h = Math.round(image.height * scale);

    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0, w, h);

    const bitmap = await createImageBitmap(canvas);
    return { bitmap, canvas };
  },
};
