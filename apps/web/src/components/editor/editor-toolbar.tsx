'use client';

import { Button } from '@regcheck/ui';
import { useEditorStore } from '@/stores/editor-store';
import type { FieldType } from '@regcheck/shared';

const TOOLS: Array<{ type: FieldType; label: string }> = [
  { type: 'text', label: 'Texto' },
  { type: 'image', label: 'Imagem' },
  { type: 'signature', label: 'Assinatura' },
  { type: 'checkbox', label: 'Checkbox' },
];

export function EditorToolbar({ templateId: _templateId }: { templateId: string }) {
  const { activeTool, setActiveTool, zoom, zoomIn, zoomOut, snapEnabled, setSnapEnabled, undo, redo, history } =
    useEditorStore();

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-background">
      {/* Field tools */}
      <div className="flex gap-1 border-r pr-2">
        {TOOLS.map((tool) => (
          <Button
            key={tool.type}
            variant={activeTool === tool.type ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTool(activeTool === tool.type ? null : tool.type)}
          >
            {tool.label}
          </Button>
        ))}
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-1 border-r pr-2">
        <Button variant="outline" size="sm" onClick={zoomOut}>
          -
        </Button>
        <span className="text-sm w-14 text-center">{Math.round(zoom * 100)}%</span>
        <Button variant="outline" size="sm" onClick={zoomIn}>
          +
        </Button>
      </div>

      {/* Grid snap */}
      <Button
        variant={snapEnabled ? 'default' : 'outline'}
        size="sm"
        onClick={() => setSnapEnabled(!snapEnabled)}
      >
        Grid
      </Button>

      {/* Undo/Redo */}
      <div className="flex gap-1 ml-auto">
        <Button variant="outline" size="sm" onClick={undo} disabled={!history.canUndo()}>
          Desfazer
        </Button>
        <Button variant="outline" size="sm" onClick={redo} disabled={!history.canRedo()}>
          Refazer
        </Button>
      </div>
    </div>
  );
}
