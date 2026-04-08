'use client';

import { Spinner } from '@regcheck/ui';

/**
 * Loading skeleton for the template editor canvas.
 * Displayed while Konva and react-konva are being loaded.
 */
export function EditorCanvasSkeleton() {
  return (
    <div className="relative flex items-center justify-center p-4 overflow-auto flex-1 bg-neutral-100">
      <div className="flex flex-col items-center gap-3">
        <Spinner className="h-8 w-8" />
        <span className="text-sm text-muted-foreground">Carregando editor...</span>
      </div>
    </div>
  );
}
