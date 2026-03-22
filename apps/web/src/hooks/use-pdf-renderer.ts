'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface PdfPage {
  pageIndex: number;
  width: number;
  height: number;
}

/**
 * Hook for rendering PDF pages to canvas using pdfjs-dist.
 * Supports lazy loading of pages and zoom.
 */
export function usePdfRenderer(pdfUrl: string | null) {
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pdfDocRef = useRef<unknown>(null);

  useEffect(() => {
    if (!pdfUrl) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

        const doc = await pdfjs.getDocument(pdfUrl).promise;
        if (cancelled) return;

        pdfDocRef.current = doc;
        const pageInfos: PdfPage[] = [];

        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 1 });
          pageInfos.push({
            pageIndex: i - 1,
            width: viewport.width,
            height: viewport.height,
          });
        }

        if (!cancelled) {
          setPages(pageInfos);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load PDF');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  /** Render a specific page to a canvas element */
  const renderPage = useCallback(
    async (pageIndex: number, canvas: HTMLCanvasElement, scale: number) => {
      const doc = pdfDocRef.current as { getPage: (n: number) => Promise<{
        getViewport: (opts: { scale: number }) => { width: number; height: number };
        render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
      }> } | null;
      if (!doc) return;

      const page = await doc.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      await page.render({ canvasContext: ctx, viewport }).promise;
    },
    [],
  );

  return { pages, loading, error, renderPage };
}
