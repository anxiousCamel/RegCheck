'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label } from '@regcheck/ui';
import { useEditorStore, type EditorField } from '@/stores/editor-store';
import { api } from '@/lib/api';
import type { FieldScope } from '@regcheck/shared';

/**
 * Right-hand properties inspector for the template editor.
 *
 * Single-select: full editor with Scope (Global vs Item SX) + Slot + Binding.
 * Multi-select: batched label/required/font/scope controls.
 */
export function FieldProperties({ templateId }: { templateId: string }) {
  const queryClient = useQueryClient();
  const {
    fields,
    selectedFieldIds,
    updateField,
    removeFields,
    setFieldScope,
    setFieldSlot,
    setFieldBinding,
  } = useEditorStore();

  const selectedFields = useMemo(
    () => fields.filter((f) => selectedFieldIds.includes(f.id)),
    [fields, selectedFieldIds],
  );

  const selectedField = selectedFields.length === 1 ? selectedFields[0] : null;

  const deleteMutation = useMutation({
    mutationFn: async (fieldIds: string[]) => {
      removeFields(fieldIds);
      const results = await Promise.allSettled(fieldIds.map((id) => api.deleteField(templateId, id)));
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) console.error('[deleteFields] Some deletions failed:', failures);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['template', templateId] }),
  });

  if (selectedFields.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Selecione um campo para editar suas propriedades.
      </div>
    );
  }

  // ─── Multi-select ────────────────────────────────────────────────────────
  if (selectedFields.length > 1) {
    const allText = selectedFields.every((f) => f.type === 'text');
    const allSameType = selectedFields.every((f) => f.type === selectedFields[0]!.type);

    const sharedRequired = allSame(selectedFields, (f) => f.config.required);
    const sharedFontSize = allText ? allSame(selectedFields, (f) => f.config.fontSize) : null;
    const sharedFontColor = allText ? allSame(selectedFields, (f) => f.config.fontColor ?? '#000000') : null;

    const handleBatchConfigUpdate = (configUpdates: Record<string, unknown>) => {
      for (const f of selectedFields) {
        updateField(f.id, { config: { ...f.config, ...configUpdates } });
      }
    };

    return (
      <div className="p-4 space-y-4">
        <h3 className="font-medium text-sm">{selectedFields.length} campos selecionados</h3>
        {allSameType && (
          <p className="text-xs text-muted-foreground capitalize">Tipo: {selectedFields[0]!.type}</p>
        )}

        <div className="space-y-3">
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
            <Label htmlFor="batch-required">Preenchimento Obrigatório</Label>
            {sharedRequired === null && <span className="text-xs text-muted-foreground">(misto)</span>}
          </div>

          {allText && (
            <>
              <div>
                <Label htmlFor="batch-fontsize">Tamanho da Letra</Label>
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
                <Label htmlFor="batch-fontcolor">Cor do Texto</Label>
                <input
                  id="batch-fontcolor"
                  type="color"
                  value={sharedFontColor ?? '#000000'}
                  onChange={(e) => handleBatchConfigUpdate({ fontColor: e.target.value })}
                  className="h-10 w-full rounded-md border cursor-pointer"
                />
                {sharedFontColor === null && <span className="text-xs text-muted-foreground">(misto)</span>}
              </div>
            </>
          )}
        </div>

        <ScopeSection selectedFields={selectedFields} setFieldScope={setFieldScope} setFieldSlot={setFieldSlot} />

        <BindingSection
          selectedFields={selectedFields}
          setFieldBinding={setFieldBinding}
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

  // ─── Single-select ───────────────────────────────────────────────────────
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
          <Label htmlFor="field-label">Nome do Campo (Visível ao Usuário)</Label>
          <Input
            id="field-label"
            value={selectedField.config.label}
            onChange={(e) =>
              updateField(selectedField.id, { config: { ...selectedField.config, label: e.target.value } })
            }
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="field-required"
            checked={selectedField.config.required}
            onChange={(e) =>
              updateField(selectedField.id, { config: { ...selectedField.config, required: e.target.checked } })
            }
            className="rounded"
          />
          <Label htmlFor="field-required">Preenchimento Obrigatório</Label>
        </div>

        {selectedField.type === 'text' && (
          <>
            <div>
              <Label htmlFor="field-placeholder">Dica de Preenchimento (Exemplo)</Label>
              <Input
                id="field-placeholder"
                value={selectedField.config.placeholder ?? ''}
                onChange={(e) =>
                  updateField(selectedField.id, { config: { ...selectedField.config, placeholder: e.target.value } })
                }
              />
            </div>
            <div>
              <Label htmlFor="field-fontsize">Tamanho da Letra</Label>
              <Input
                id="field-fontsize"
                type="number"
                min={6}
                max={72}
                value={selectedField.config.fontSize ?? 12}
                onChange={(e) =>
                  updateField(selectedField.id, { config: { ...selectedField.config, fontSize: Number(e.target.value) } })
                }
              />
            </div>
            <div>
              <Label htmlFor="field-fontcolor">Cor do Texto</Label>
              <input
                id="field-fontcolor"
                type="color"
                value={selectedField.config.fontColor ?? '#000000'}
                onChange={(e) =>
                  updateField(selectedField.id, { config: { ...selectedField.config, fontColor: e.target.value } })
                }
                className="h-10 w-full rounded-md border cursor-pointer"
              />
            </div>
          </>
        )}

        <ScopeSection selectedFields={[selectedField]} setFieldScope={setFieldScope} setFieldSlot={setFieldSlot} />
        <BindingSection selectedFields={[selectedField]} setFieldBinding={setFieldBinding} />

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
          Remover Campo
        </Button>
      </div>
    </div>
  );
}

// ─── Scope + Slot section ────────────────────────────────────────────────────

interface ScopeSectionProps {
  selectedFields: EditorField[];
  setFieldScope: (ids: string[], scope: FieldScope, slotIndex?: number) => void;
  setFieldSlot: (ids: string[], slotIndex: number | null) => void;
}

function ScopeSection({ selectedFields, setFieldScope, setFieldSlot }: ScopeSectionProps) {
  const ids = selectedFields.map((f) => f.id);
  const sharedScope = allSame(selectedFields, (f) => f.scope);
  const sharedSlot = allSame(selectedFields, (f) => f.slotIndex);
  const [slotInput, setSlotInput] = useState('');

  return (
    <div className="border-t pt-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Onde este campo se repete?</p>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={sharedScope === 'global' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFieldScope(ids, 'global')}
          title="O campo aparece uma única vez no formulário (ex: Nome do Técnico)"
        >
          Geral
        </Button>
        <Button
          variant={sharedScope === 'item' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFieldScope(ids, 'item')}
          title="O campo se repete para cada equipamento na lista"
        >
          Por Item
        </Button>
      </div>
      {sharedScope === null && <p className="text-xs text-muted-foreground">(regra mista)</p>}

      {sharedScope !== 'global' && (
        <div className="space-y-1">
          <Label>Posição na Lista de Equipamentos</Label>
          {sharedSlot !== null && sharedSlot !== undefined && (
            <p className="text-sm font-medium">Slot S{sharedSlot}</p>
          )}
          {sharedSlot === null && <p className="text-xs text-muted-foreground">(posições mistas)</p>}
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              placeholder="Posição (0, 1, 2...)"
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
                  setFieldSlot(ids, n);
                  setSlotInput('');
                }
              }}
            >
              Definir
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Binding key section ─────────────────────────────────────────────────────

interface BindingSectionProps {
  selectedFields: EditorField[];
  setFieldBinding: (ids: string[], bindingKey: string | null) => void;
}

/**
 * Suggestions are just hints. The bindingKey field is free-form so new data
 * sources can be added on the producer side without UI changes.
 */
const BINDING_SUGGESTIONS: Record<FieldScope, string[]> = {
  item: ['eq.numero', 'eq.serie', 'eq.patrimonio', 'eq.modelo', 'eq.ip', 'eq.setor'],
  global: [
    'global.data.dia', 
    'global.data.mes', 
    'global.data.ano', 
    'global.tecnico', 
    'global.assinatura'
  ],
};

const BINDING_KEY_RE = /^(global|eq)\.[a-z][a-z0-9_.]*$/;

function BindingSection({ selectedFields, setFieldBinding }: BindingSectionProps) {
  const ids = selectedFields.map((f) => f.id);
  const sharedBinding = allSame(selectedFields, (f) => f.bindingKey ?? '');
  const sharedScope = allSame(selectedFields, (f) => f.scope);
  const [value, setValue] = useState<string | null>(null); // null = follow shared
  const current = value ?? (sharedBinding ?? '');

  const isValid = current === '' || BINDING_KEY_RE.test(current);
  const suggestions = sharedScope ? BINDING_SUGGESTIONS[sharedScope] : [];

  return (
    <div className="border-t pt-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Preenchimento Automático (Dados do Sistema)</p>
      <p className="text-[11px] text-muted-foreground">
        O sistema pode preencher este campo sozinho usando dados salvos.
      </p>

      <Input
        placeholder="ex.: eq.numero"
        value={current}
        onChange={(e) => setValue(e.target.value)}
      />
      {!isValid && (
        <p className="text-xs text-red-600">Formato inválido. Use o padrão sugerido abaixo.</p>
      )}
      {sharedBinding === null && <p className="text-xs text-muted-foreground">(vários tipos selecionados)</p>}

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestions.map((s) => (
            <Button
              key={s}
              variant="outline"
              size="sm"
              className="h-6 text-[11px]"
              onClick={() => setValue(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={!isValid || current === (sharedBinding ?? '')}
          onClick={() => setFieldBinding(ids, current === '' ? null : current)}
        >
          Aplicar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!sharedBinding}
          onClick={() => {
            setFieldBinding(ids, null);
            setValue('');
          }}
        >
          Limpar
        </Button>
      </div>
    </div>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────

/** Returns the shared value if every element maps to the same thing; `null` if mixed. */
function allSame<T, V>(items: T[], pick: (t: T) => V): V | null {
  if (items.length === 0) return null;
  const first = pick(items[0]!);
  for (let i = 1; i < items.length; i++) {
    if (pick(items[i]!) !== first) return null;
  }
  return first;
}
