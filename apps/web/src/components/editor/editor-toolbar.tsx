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
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-background shadow-sm">
      {/* Field tools */}
      <div className="flex gap-1 border-r pr-2">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <Button
              key={tool.type}
              variant={activeTool === tool.type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTool(activeTool === tool.type ? null : tool.type)}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              {tool.label}
            </Button>
          );
        })}
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-1 border-r pr-2">
        <Button variant="outline" size="sm" onClick={zoomOut} title="Diminuir Zoom">
          <Minus className="h-4 w-4" />
        </Button>
        <span className="text-sm w-14 text-center font-medium">{Math.round(zoom * 100)}%</span>
        <Button variant="outline" size="sm" onClick={zoomIn} title="Aumentar Zoom">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Grid snap */}
      <Button
        variant={snapEnabled ? 'default' : 'outline'}
        size="sm"
        onClick={() => setSnapEnabled(!snapEnabled)}
        className="gap-2"
      >
        <Grid3X3 className={cn("h-4 w-4", snapEnabled ? "text-primary-foreground" : "text-muted-foreground")} />
        Grid
      </Button>

      {/* Undo/Redo */}
      <div className="flex gap-1 ml-auto">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={undo} 
          disabled={!history.canUndo()}
          className="gap-2"
        >
          <Undo2 className="h-4 w-4" />
          Desfazer
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={redo} 
          disabled={!history.canRedo()}
          className="gap-2"
        >
          <Redo2 className="h-4 w-4" />
          Refazer
        </Button>
      </div>
    </div>
  );
}
