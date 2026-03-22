'use client';

import { cn } from '@regcheck/ui';
import { useEditorStore } from '@/stores/editor-store';

export function PageNavigator() {
  const { currentPage, totalPages, setCurrentPage, fields } = useEditorStore();

  const pages = Array.from({ length: totalPages }, (_, i) => i);

  return (
    <div className="w-24 border-r overflow-y-auto bg-muted/20 p-2 space-y-2">
      <p className="text-xs font-medium text-muted-foreground text-center">Paginas</p>
      {pages.map((pageIdx) => {
        const fieldCount = fields.filter((f) => f.pageIndex === pageIdx).length;
        return (
          <button
            key={pageIdx}
            onClick={() => setCurrentPage(pageIdx)}
            className={cn(
              'w-full aspect-[3/4] rounded border text-xs flex flex-col items-center justify-center gap-1 transition-colors',
              currentPage === pageIdx
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:border-primary/50',
            )}
          >
            <span className="font-medium">{pageIdx + 1}</span>
            {fieldCount > 0 && (
              <span className="text-[10px] text-muted-foreground">{fieldCount} campos</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
