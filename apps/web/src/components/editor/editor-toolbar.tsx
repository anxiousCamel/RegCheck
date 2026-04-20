'use client';

import { Button, cn } from '@regcheck/ui';
import { 
  Type, 
  Image as ImageIcon, 
  PenTool, 
  CheckSquare, 
  Undo2, 
  Redo2, 
  Minus, 
  Plus, 
  Grid3X3 
} from 'lucide-react';
import { useEditorStore } from '@/stores/editor-store';
import type { FieldType } from '@regcheck/shared';

const TOOLS: Array<{ type: FieldType; label: string; icon: React.ElementType }> = [
  { type: 'text', label: 'Texto', icon: Type },
  { type: 'image', label: 'Imagem', icon: ImageIcon },
  { type: 'signature', label: 'Assinatura', icon: PenTool },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
];

export function EditorToolbar({ templateId: _templateId }: { templateId: string }) {
  const { activeTool, setActiveTool, zoom, zoomIn, zoomOut, snapEnabled, setSnapEnabled, undo, redo, history } =
    useEditorStore();

  return (
    <div className="flex items-center gap-2 p-1.5 bg-white/90 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] max-w-[90vw] sm:max-w-none overflow-x-auto scrollbar-hide">
      {/* Field tools Group */}
      <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.type;
          return (
            <button
              key={tool.type}
              onClick={() => setActiveTool(isActive ? null : tool.type)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 group",
                isActive 
                  ? "bg-primary text-white shadow-md shadow-primary/20 scale-105" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-white"
              )}
              title={tool.label}
            >
              <Icon className={cn("h-4 w-4 transition-transform group-active:scale-90", isActive ? "stroke-[3px]" : "stroke-[2px]")} />
              <span className="text-[11px] font-black uppercase tracking-tight hidden md:inline">{tool.label}</span>
            </button>
          );
        })}
      </div>

      <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

      {/* Grid & Snap */}
      <button
        onClick={() => setSnapEnabled(!snapEnabled)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200",
          snapEnabled ? "text-primary bg-primary/10" : "text-slate-500 hover:text-slate-900 hover:bg-white"
        )}
        title="Ativar Grid"
      >
        <Grid3X3 className="h-4 w-4" />
        <span className="text-[11px] font-black uppercase tracking-tight hidden lg:inline text-current">Grid</span>
      </button>

      <div className="w-px h-6 bg-slate-200 mx-1" />

      {/* Zoom Group */}
      <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl">
        <button 
          onClick={zoomOut} 
          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="text-[10px] w-12 text-center font-black text-slate-700 select-none">
          {Math.round(zoom * 100)}%
        </span>
        <button 
          onClick={zoomIn} 
          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

      {/* Undo/Redo Group */}
      <div className="flex items-center gap-1 ml-auto">
        <button 
          onClick={undo} 
          disabled={!history.canUndo()}
          className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white disabled:opacity-20 disabled:pointer-events-none rounded-lg transition-all active:scale-90"
          title="Desfazer"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button 
          onClick={redo} 
          disabled={!history.canRedo()}
          className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white disabled:opacity-20 disabled:pointer-events-none rounded-lg transition-all active:scale-90"
          title="Refazer"
        >
          <Redo2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
