'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button, Input, Label } from '@regcheck/ui';
import { useEditorStore } from '@/stores/editor-store';
import { api } from '@/lib/api';
import type { FieldType } from '@regcheck/shared';

const FIELD_COLORS: Record<FieldType, string> = {
  text: '#3b82f6',
  image: '#10b981',
  signature: '#f59e0b',
  checkbox: '#8b5cf6',
};

export function RepetitionConfig({ templateId }: { templateId: string }) {
  const {
    fields,
    selectedFieldIds,
    replicationPreview,
    setReplicationPreview,
    clearReplicationPreview,
    applyReplication,
  } = useEditorStore();

  const [copies, setCopies] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0.05);
  const [sourceIds, setSourceIds] = useState<string[]>([]);

  // Track selected fields as source for replication
  const selectedFields = fields.filter((f) => selectedFieldIds.includes(f.id));

  const handleMarkSelected = useCallback(() => {
    if (selectedFieldIds.length === 0) return;
    setSourceIds(selectedFieldIds);
  }, [selectedFieldIds]);

  // Update preview whenever parameters change
  useEffect(() => {
    if (sourceIds.length === 0) {
      clearReplicationPreview();
      return;
    }
    // Check source fields still exist
    const validIds = sourceIds.filter((id) => fields.some((f) => f.id === id));
    if (validIds.length === 0) {
      setSourceIds([]);
      clearReplicationPreview();
      return;
    }
    setReplicationPreview(validIds, copies, offsetX, offsetY);
  }, [sourceIds, copies, offsetX, offsetY, fields, setReplicationPreview, clearReplicationPreview]);

  // Clear preview on unmount
  useEffect(() => {
    return () => clearReplicationPreview();
  }, [clearReplicationPreview]);

  const createFieldMutation = useMutation({
    mutationFn: async (fieldData: { clientId: string; type: FieldType; pageIndex: number; position: Record<string, number>; config: Record<string, unknown> }) => {
      const { clientId: _, ...payload } = fieldData;
      return api.createField(templateId, payload) as Promise<{ id: string }>;
    },
    onSuccess: (serverField, variables) => {
      if (serverField?.id && serverField.id !== variables.clientId) {
        useEditorStore.getState().updateFieldId(variables.clientId, serverField.id);
      }
    },
  });

  const [isApplying, setIsApplying] = useState(false);

  const handleApply = useCallback(async () => {
    setIsApplying(true);
    // Block autosave while we create all fields
    useEditorStore.getState().setBatchOperation(true);

    try {
      const newFields = applyReplication();
      // Persist ALL fields to API and wait for all to resolve
      // This prevents autosave from running with temporary UUIDs
      await Promise.all(
        newFields.map((f) =>
          createFieldMutation.mutateAsync({
            clientId: f.id,
            type: f.type,
            pageIndex: f.pageIndex,
            position: f.position as unknown as Record<string, number>,
            config: f.config as unknown as Record<string, unknown>,
          }),
        ),
      );
    } catch (err) {
      console.error('[Replication] Some fields failed to persist:', err);
    } finally {
      useEditorStore.getState().setBatchOperation(false);
      setIsApplying(false);
    }
    setSourceIds([]);
  }, [applyReplication, createFieldMutation]);

  const handleClear = useCallback(() => {
    setSourceIds([]);
    clearReplicationPreview();
  }, [clearReplicationPreview]);

  const sourceFields = fields.filter((f) => sourceIds.includes(f.id));
  const hasPreview = replicationPreview && replicationPreview.ghosts.length > 0;

  // Check if any ghost goes out of bounds
  const outOfBounds = replicationPreview?.ghosts.some(
    (g) => g.position.x + g.position.width > 1.01 || g.position.y + g.position.height > 1.01 || g.position.x < 0 || g.position.y < 0,
  );

  return (
    <div className="p-4 border-t space-y-4">
      <h3 className="font-medium text-sm">Replicar Campos</h3>
      <p className="text-xs text-muted-foreground">
        Selecione campos no canvas e marque para replicar. Um preview fantasma mostra onde as copias ficarao.
      </p>

      {/* Step 1: Mark source fields */}
      {sourceIds.length === 0 ? (
        <div className="space-y-2">
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleMarkSelected}
            disabled={selectedFieldIds.length === 0}
          >
            Marcar {selectedFieldIds.length > 0 ? `${selectedFieldIds.length} campo(s)` : 'selecionados'} para replicar
          </Button>
          {selectedFieldIds.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Selecione campos no canvas primeiro.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Source fields list */}
          <div className="space-y-1">
            <p className="text-xs font-medium">Campos marcados:</p>
            {sourceFields.map((f) => (
              <div key={f.id} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: FIELD_COLORS[f.type] }}
                />
                <span className="truncate">{f.config.label}</span>
                <span className="text-muted-foreground capitalize">({f.type})</span>
              </div>
            ))}
          </div>

          {/* Replication parameters */}
          <div className="space-y-3">
            <div>
              <Label>Numero de copias</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={copies}
                onChange={(e) => setCopies(Math.max(1, Math.min(50, Number(e.target.value))))}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Offset X</Label>
                <Input
                  type="number"
                  min={-1}
                  max={1}
                  step={0.01}
                  value={offsetX}
                  onChange={(e) => setOffsetX(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Offset Y</Label>
                <Input
                  type="number"
                  min={-1}
                  max={1}
                  step={0.01}
                  value={offsetY}
                  onChange={(e) => setOffsetY(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Warnings */}
          {outOfBounds && (
            <p className="text-xs text-amber-600">
              Algumas copias ficam fora dos limites da pagina. Ajuste os offsets.
            </p>
          )}

          {/* Preview info */}
          {hasPreview && (
            <div className="text-xs text-muted-foreground border rounded p-2 bg-muted/30">
              <p className="font-medium mb-1">Preview no canvas:</p>
              <p>{replicationPreview.ghosts.length} campo(s) fantasma visivel(is)</p>
              <p className="mt-1">
                Labels: {sourceFields.map((f) => `"${f.config.label}"` ).join(', ')}
                {' → '}
                {sourceFields.map((f) => `"${f.config.label} 2"` ).join(', ')}
                {copies > 1 && `, ... "${sourceFields[0]?.config.label} ${copies + 1}"`}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={handleApply}
              disabled={!hasPreview || !!outOfBounds || isApplying}
            >
              {isApplying ? 'Aplicando...' : 'Aplicar'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClear}
            >
              Limpar
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
