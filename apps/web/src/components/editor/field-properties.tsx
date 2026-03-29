'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label } from '@regcheck/ui';
import { useEditorStore } from '@/stores/editor-store';
import { api } from '@/lib/api';

export function FieldProperties({ templateId }: { templateId: string }) {
  const queryClient = useQueryClient();
  const { fields, selectedFieldIds, updateField, updateFields, removeFields, setEquipmentGroup } = useEditorStore();

  const selectedFields = useMemo(
    () => fields.filter((f) => selectedFieldIds.includes(f.id)),
    [fields, selectedFieldIds],
  );

  const selectedField = selectedFields.length === 1 ? selectedFields[0] : null;

  const deleteMutation = useMutation({
    mutationFn: async (fieldIds: string[]) => {
      // Optimistically remove from state before API call
      removeFields(fieldIds);
      // Delete from backend
      const results = await Promise.allSettled(fieldIds.map((id) => api.deleteField(templateId, id)));
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        console.error('[deleteFields] Some deletions failed:', failures);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template', templateId] });
    },
  });

  if (selectedFields.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Selecione um campo para editar suas propriedades.
      </div>
    );
  }

  // Multi-select: batch property editing
  if (selectedFields.length > 1) {
    const allText = selectedFields.every((f) => f.type === 'text');
    const allSameType = selectedFields.every((f) => f.type === selectedFields[0].type);

    // Compute shared values (null if mixed)
    const sharedRequired = selectedFields.every((f) => f.config.required === selectedFields[0].config.required)
      ? selectedFields[0].config.required
      : null;
    const sharedFontSize =
      allText && selectedFields.every((f) => f.config.fontSize === selectedFields[0].config.fontSize)
        ? selectedFields[0].config.fontSize
        : null;
    const sharedFontColor =
      allText && selectedFields.every((f) => f.config.fontColor === selectedFields[0].config.fontColor)
        ? (selectedFields[0].config.fontColor ?? '#000000')
        : null;

    const handleBatchConfigUpdate = (configUpdates: Record<string, unknown>) => {
      for (const f of selectedFields) {
        updateField(f.id, { config: { ...f.config, ...configUpdates } });
      }
    };

    return (
      <div className="p-4 space-y-4">
        <h3 className="font-medium text-sm">{selectedFields.length} campos selecionados</h3>
        {allSameType && (
          <p className="text-xs text-muted-foreground capitalize">Tipo: {selectedFields[0].type}</p>
        )}

        <div className="space-y-3">
          {/* Required toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="batch-required"
              checked={sharedRequired ?? false}
              ref={(el) => {
                if (el) el.indeterminate = sharedRequired === null;
              }}
              onChange={(e) => handleBatchConfigUpdate({ required: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="batch-required">Obrigatorio</Label>
            {sharedRequired === null && (
              <span className="text-xs text-muted-foreground">(misto)</span>
            )}
          </div>

          {/* Text-specific batch properties */}
          {allText && (
            <>
              <div>
                <Label htmlFor="batch-fontsize">Tamanho da fonte</Label>
                <Input
                  id="batch-fontsize"
                  type="number"
                  min={6}
                  max={72}
                  value={sharedFontSize ?? ''}
                  placeholder={sharedFontSize === null ? 'Misto' : undefined}
                  onChange={(e) => handleBatchConfigUpdate({ fontSize: Number(e.target.value) })}
                />
              </div>

              <div>
                <Label htmlFor="batch-fontcolor">Cor do texto</Label>
                <input
                  id="batch-fontcolor"
                  type="color"
                  value={sharedFontColor ?? '#000000'}
                  onChange={(e) => handleBatchConfigUpdate({ fontColor: e.target.value })}
                  className="h-10 w-full rounded-md border cursor-pointer"
                />
                {sharedFontColor === null && (
                  <span className="text-xs text-muted-foreground">(misto)</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Equipment slot assignment */}
        <EquipmentGroupSection
          selectedFields={selectedFields}
          selectedFieldIds={selectedFieldIds}
          setEquipmentGroup={setEquipmentGroup}
        />

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

        {/* Auto-populate toggle — marks field as readonly in documents */}
        {selectedField.type === 'text' && (
          <div className="space-y-2 border rounded-md p-2 bg-muted/20">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="field-autopopulate"
                checked={selectedField.autoPopulate ?? false}
                onChange={(e) =>
                  updateField(selectedField.id, { autoPopulate: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="field-autopopulate">Pre-preenchido (readonly)</Label>
            </div>
            {selectedField.autoPopulate && (
              <div>
                <Label htmlFor="field-autopopulate-key">Chave de mapeamento</Label>
                <select
                  id="field-autopopulate-key"
                  value={selectedField.autoPopulateKey ?? ''}
                  onChange={(e) =>
                    updateField(selectedField.id, { autoPopulateKey: e.target.value || undefined })
                  }
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecione...</option>
                  <option value="numero">Numero do equipamento</option>
                  <option value="serie">Serie / Serial</option>
                  <option value="patrimonio">Patrimonio</option>
                  <option value="setor">Setor</option>
                </select>
              </div>
            )}
          </div>
        )}

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

        {/* Equipment slot assignment */}
        <EquipmentGroupSection
          selectedFields={[selectedField]}
          selectedFieldIds={[selectedField.id]}
          setEquipmentGroup={setEquipmentGroup}
        />

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

// ─── Equipment Group (Slot) Section ──────────────────────────────────────────

interface EquipmentGroupSectionProps {
  selectedFields: Array<{ id: string; equipmentGroup?: number | null }>;
  selectedFieldIds: string[];
  setEquipmentGroup: (fieldIds: string[], group: number | null) => void;
}

function EquipmentGroupSection({ selectedFields, selectedFieldIds, setEquipmentGroup }: EquipmentGroupSectionProps) {
  const [slotInput, setSlotInput] = useState('');

  const currentGroups = selectedFields.map((f) => f.equipmentGroup);
  const allSameGroup = currentGroups.every((g) => g === currentGroups[0]);
  const currentGroup = allSameGroup ? currentGroups[0] : undefined;
  const hasGroup = currentGroups.some((g) => g != null);

  return (
    <div className="border-t pt-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Slot de Equipamento</p>
      {currentGroup != null && (
        <p className="text-sm font-medium">Slot {currentGroup}</p>
      )}
      {currentGroup === undefined && hasGroup && (
        <p className="text-xs text-muted-foreground">(slots mistos)</p>
      )}
      {currentGroup === null && !hasGroup && (
        <p className="text-xs text-muted-foreground">Nenhum slot atribuido</p>
      )}
      <div className="flex gap-2">
        <Input
          type="number"
          min={0}
          placeholder="Slot (0, 1, 2...)"
          value={slotInput}
          onChange={(e) => setSlotInput(e.target.value)}
          className="flex-1 h-8 text-sm"
        />
        <Button
          variant="outline"
          size="sm"
          disabled={slotInput === ''}
          onClick={() => {
            const n = parseInt(slotInput, 10);
            if (!isNaN(n) && n >= 0) {
              setEquipmentGroup(selectedFieldIds, n);
              setSlotInput('');
            }
          }}
        >
          Atribuir
        </Button>
      </div>
      {hasGroup && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => {
            setEquipmentGroup(selectedFieldIds, null);
            setSlotInput('');
          }}
        >
          Remover do slot
        </Button>
      )}
    </div>
  );
}
