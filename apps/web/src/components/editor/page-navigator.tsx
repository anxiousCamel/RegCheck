'use client';

import { cn } from '@regcheck/ui';
import { useEditorStore } from '@/stores/editor-store';

export function PageNavigator() {
  const { currentPage, totalPages, setCurrentPage, fields } = useEditorStore();

  const pages = Array.from({ length: totalPages }, (_, i) => i);

  return (
    <div className="flex flex-col gap-4 py-2">
      {pages.map((pageIdx) => {
        const fieldCount = fields.filter((f) => f.pageIndex === pageIdx).length;
        const isActive = currentPage === pageIdx;

        return (
          <div key={pageIdx} className="flex flex-col items-center gap-1.5 px-2">
            <button
              onClick={() => setCurrentPage(pageIdx)}
              className={cn(
                'w-full aspect-[1/1.4] rounded-lg border-2 transition-all duration-300 relative group overflow-hidden bg-slate-50',
                isActive
                  ? 'border-primary shadow-md ring-1 ring-primary/10'
                  : 'border-slate-100 hover:border-slate-300',
              )}
            >
              {/* Page Number Badge */}
              <div
                className={cn(
                  'absolute top-2 left-2 h-5 w-5 rounded flex items-center justify-center text-[10px] font-black transition-colors z-10',
                  isActive
                    ? 'bg-primary text-white'
                    : 'bg-slate-200 text-slate-500 group-hover:text-slate-700',
                )}
              >
                {pageIdx + 1}
              </div>

              {/* Field Count Indicator */}
              {fieldCount > 0 && (
                <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white border border-slate-100 shadow-sm">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  <span className="text-[8px] font-black text-slate-400">{fieldCount}</span>
                </div>
              )}

              {/* Visual Placeholder for PDF */}
              <div className="absolute inset-4 flex flex-col gap-2 opacity-[0.03]">
                <div className="h-1 w-full bg-slate-900 rounded-full" />
                <div className="h-1 w-3/4 bg-slate-900 rounded-full" />
                <div className="h-1 w-full bg-slate-900 rounded-full" />
                <div className="mt-4 h-8 w-full border border-slate-900 rounded-sm" />
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
