/** Captures an image via file input (works on HTTP mobile). Returns ImageBitmap. */

export const CameraInputService = {
  /** Opens native camera via file input, returns ImageBitmap. */
  capture(fileInput: HTMLInputElement): Promise<ImageBitmap> {
    return new Promise((resolve, reject) => {
      const el = fileInput as unknown as EventTarget & {
        files: FileList | null;
        value: string;
        click(): void;
      };

      const cleanup = () => {
        el.removeEventListener('change', onChange);
        el.removeEventListener('cancel', onCancel);
      };

      const onChange = async () => {
        cleanup();
        const file = el.files?.[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }

        try {
          const bitmap = await createImageBitmap(file);
          resolve(bitmap);
        } catch {
          reject(new Error('Failed to load image'));
        } finally {
          el.value = '';
        }
      };

      const onCancel = () => {
        cleanup();
        reject(new DOMException('User cancelled', 'AbortError'));
      };

      el.addEventListener('change', onChange, { once: true });
      el.addEventListener('cancel', onCancel, { once: true });
      el.click();
    });
  },
};
