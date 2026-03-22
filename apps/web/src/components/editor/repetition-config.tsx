'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Input, Label } from '@regcheck/ui';
import { RepetitionEngine } from '@regcheck/editor-engine';
import { api } from '@/lib/api';
import type { RepetitionConfig as RepConfig } from '@regcheck/shared';

const PREVIEW_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

export function RepetitionConfig({ templateId }: { templateId: string }) {
  const { data: template } = useQuery({
    queryKey: ['template', templateId],
    queryFn: () => api.getTemplate(templateId),
  });

  const [config, setConfig] = useState<RepConfig>({
    itemsPerPage: 2,
    columns: 1,
    rows: 2,
    offsetX: 0,
    offsetY: 0.5,
    startX: 0,
    startY: 0,
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Load existing config
  useEffect(() => {
    const t = template as { repetitionConfig?: RepConfig } | undefined;
    if (t?.repetitionConfig) {
      setConfig(t.repetitionConfig);
    }
  }, [template]);

  // Validate on change
  useEffect(() => {
    setValidationErrors(RepetitionEngine.validate(config));
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: () => api.updateTemplate(templateId, { repetition: config }),
  });

  const updateConfigField = (field: keyof RepConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  // Preview computation
  const previewLayout = RepetitionEngine.computeLayout(6, config);

  return (
    <div className="p-4 border-t space-y-4">
      <h3 className="font-medium text-sm">Repeticao Inteligente</h3>
      <p className="text-xs text-muted-foreground">
        Configure como os campos se repetem para multiplos itens.
      </p>

      <div className="space-y-3">
        <div>
          <Label>Itens por pagina</Label>
          <Input
            type="number"
            min={1}
            max={50}
            value={config.itemsPerPage}
            onChange={(e) => updateConfigField('itemsPerPage', Number(e.target.value))}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Colunas</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={config.columns}
              onChange={(e) => updateConfigField('columns', Number(e.target.value))}
            />
          </div>
          <div>
            <Label>Linhas</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={config.rows}
              onChange={(e) => updateConfigField('rows', Number(e.target.value))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Offset X</Label>
            <Input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={config.offsetX}
              onChange={(e) => updateConfigField('offsetX', Number(e.target.value))}
            />
          </div>
          <div>
            <Label>Offset Y</Label>
            <Input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={config.offsetY}
              onChange={(e) => updateConfigField('offsetY', Number(e.target.value))}
            />
          </div>
        </div>

        {validationErrors.length > 0 && (
          <div className="text-xs text-destructive space-y-1">
            {validationErrors.map((err, i) => (
              <p key={i}>{err}</p>
            ))}
          </div>
        )}

        <div className="border rounded p-2">
          <p className="text-xs font-medium mb-2">Preview (6 itens) - {previewLayout.totalPages} pagina(s)</p>
          <div className="flex gap-2 overflow-x-auto">
            {previewLayout.pageItems.map((page) => {
              const cellW = config.offsetX * 100 * 0.9 || 90 / config.columns;
              const cellH = config.offsetY * 100 * 0.9 || 90 / config.rows;
              return (
                <div key={page.pageIndex} className="flex-shrink-0">
                  <p className="text-[10px] text-muted-foreground mb-1">Pag. {page.pageIndex + 1}</p>
                  <svg viewBox="0 0 100 141.42" width={120} height={170} className="border bg-white rounded">
                    {page.items.map((item) => {
                      const x = item.offsetX * 100;
                      const y = item.offsetY * 100;
                      const color = PREVIEW_COLORS[item.itemIndex % PREVIEW_COLORS.length];
                      return (
                        <g key={item.itemIndex}>
                          <rect x={x} y={y} width={cellW} height={cellH}
                            fill={color} opacity={0.3} stroke={color} strokeWidth={0.5} rx={1} />
                          <text x={x + cellW / 2} y={y + cellH / 2}
                            textAnchor="middle" dominantBaseline="central"
                            fontSize={4} fill="#333" fontWeight="bold">
                            {item.itemIndex + 1}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              );
            })}
          </div>
        </div>

        <Button
          size="sm"
          className="w-full"
          onClick={() => saveMutation.mutate()}
          disabled={validationErrors.length > 0 || saveMutation.isPending}
        >
          Salvar Configuracao
        </Button>
      </div>
    </div>
  );
}
