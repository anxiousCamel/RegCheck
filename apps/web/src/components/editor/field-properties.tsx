'use client';

import { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button, Input, Label } from '@regcheck/ui';
import { useEditorStore } from '@/stores/editor-store';
import { api } from '@/lib/api';

export function FieldProperties({ templateId }: { templateId: string }) {
  const { fields, selectedFieldIds, updateField, removeFields } = useEditorStore();

  const selectedFields = useMemo(
    () => fields.filter((f) => selectedFieldIds.includes(f.id)),
    [fields, selectedFieldIds],
  );

  const selectedField = selectedFields.length === 1 ? selectedFields[0] : null;

  const deleteMutation = useMutation({
    mutationFn: async (fieldIds: string[]) => {
      await Promise.all(fieldIds.map((id) => api.deleteField(templateId, id)));
    },
    onSuccess: (_, fieldIds) => removeFields(fieldIds),
  });

  if (selectedFields.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Selecione um campo para editar suas propriedades.
      </div>
    );
  }

  // Multi-select: show count + bulk delete only
  if (selectedFields.length > 1) {
    return (
      <div className="p-4 space-y-4">
        <h3 className="font-medium text-sm">{selectedFields.length} campos selecionados</h3>
        <p className="text-xs text-muted-foreground">
          Shift+Clique para selecionar varios. Delete para excluir. Ctrl+C para copiar.
        </p>
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => deleteMutation.mutate(selectedFieldIds)}
          disabled={deleteMutation.isPending}
        >
          Excluir {selectedFields.length} campos
        </Button>
      </div>
    );
  }

  // Single selection: full property editor
  if (!selectedField) return null;

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-medium text-sm">Propriedades do Campo</h3>

      <div className="space-y-3">
        <div>
          <Label>Tipo</Label>
          <p className="text-sm font-medium capitalize">{selectedField.type}</p>
        </div>

        <div>
          <Label htmlFor="field-label">Label</Label>
          <Input
            id="field-label"
            value={selectedField.config.label}
            onChange={(e) =>
              updateField(selectedField.id, {
                config: { ...selectedField.config, label: e.target.value },
              })
            }
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="field-required"
            checked={selectedField.config.required}
            onChange={(e) =>
              updateField(selectedField.id, {
                config: { ...selectedField.config, required: e.target.checked },
              })
            }
            className="rounded"
          />
          <Label htmlFor="field-required">Obrigatorio</Label>
        </div>

        {selectedField.type === 'text' && (
          <>
            <div>
              <Label htmlFor="field-placeholder">Placeholder</Label>
              <Input
                id="field-placeholder"
                value={selectedField.config.placeholder ?? ''}
                onChange={(e) =>
                  updateField(selectedField.id, {
                    config: { ...selectedField.config, placeholder: e.target.value },
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="field-fontsize">Tamanho da fonte</Label>
              <Input
                id="field-fontsize"
                type="number"
                min={6}
                max={72}
                value={selectedField.config.fontSize ?? 12}
                onChange={(e) =>
                  updateField(selectedField.id, {
                    config: { ...selectedField.config, fontSize: Number(e.target.value) },
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="field-fontcolor">Cor do texto</Label>
              <input
                id="field-fontcolor"
                type="color"
                value={selectedField.config.fontColor ?? '#000000'}
                onChange={(e) =>
                  updateField(selectedField.id, {
                    config: { ...selectedField.config, fontColor: e.target.value },
                  })
                }
                className="h-10 w-full rounded-md border cursor-pointer"
              />
            </div>
          </>
        )}

        {/* Position (read-only display) */}
        <div className="border-t pt-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Posicao</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>X: {(selectedField.position.x * 100).toFixed(1)}%</div>
            <div>Y: {(selectedField.position.y * 100).toFixed(1)}%</div>
            <div>W: {(selectedField.position.width * 100).toFixed(1)}%</div>
            <div>H: {(selectedField.position.height * 100).toFixed(1)}%</div>
          </div>
        </div>

        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => deleteMutation.mutate([selectedField.id])}
          disabled={deleteMutation.isPending}
        >
          Excluir Campo
        </Button>
      </div>
    </div>
  );
}
