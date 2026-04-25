'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button, Input, Label, cn } from '@regcheck/ui';
import { useEditorStore, type EditorField } from '@/stores/editor-store';
import { api } from '@/lib/api';
import {
  Trash2,
  Link as LinkIcon,
  Settings,
  MousePointer2,
  Layers,
} from 'lucide-react';
import type { FieldScope, FillMode } from '@regcheck/shared';

export function FieldProperties({
  templateId,
  fillMode,
}: {
  templateId: string;
  fillMode: FillMode;
}) {
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
      await Promise.allSettled(fieldIds.map((id) => api.deleteField(templateId, id)));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['template', templateId] }),
  });

  if (selectedFields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4 px-6 opacity-40">
        <MousePointer2 size={32} className="text-slate-300" />
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
          Selecione um campo para editar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="space-y-1">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
          Inspecionador
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight text-slate-900">
            {selectedFields.length > 1 ? `${selectedFields.length} Itens` : selectedField?.type}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Config */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Settings className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Configuração
            </span>
          </div>

          {selectedField && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 px-1">
                  Nome do Campo
                </Label>
                <Input
                  value={selectedField.config.label}
                  onChange={(e) =>
                    updateField(selectedField.id, {
                      config: { ...selectedField.config, label: e.target.value },
                    })
                  }
                  className="bg-slate-50 border-slate-200 rounded-xl h-10 font-bold focus:ring-primary/20 text-slate-900"
                />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <input
                  type="checkbox"
                  id="field-required"
                  checked={selectedField.config.required}
                  onChange={(e) =>
                    updateField(selectedField.id, {
                      config: { ...selectedField.config, required: e.target.checked },
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 bg-white text-primary focus:ring-primary/20"
                />
                <Label
                  htmlFor="field-required"
                  className="text-xs font-bold cursor-pointer text-slate-700"
                >
                  Obrigatório
                </Label>
              </div>
            </div>
          )}

          {selectedFields.length > 1 && (
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <p className="text-xs font-bold text-primary">Edição em Massa Ativa</p>
              <p className="text-[10px] text-primary/60 mt-1 uppercase font-black">
                Alterações afetarão todos os campos.
              </p>
            </div>
          )}
        </section>

        {/* Scope & Repetition */}
        <section className="space-y-4">
          <ScopeSection
            selectedFields={selectedFields}
            setFieldScope={setFieldScope}
            setFieldSlot={setFieldSlot}
          />
        </section>

        {fillMode === 'SELECAO_MANUAL' && selectedFields.some((f) => f.scope === 'item') && (
          <section className="space-y-4">
            <EquipmentTypeSection selectedFields={selectedFields} />
          </section>
        )}

        {/* Data Binding */}
        <section className="space-y-4">
          <BindingSection selectedFields={selectedFields} setFieldBinding={setFieldBinding} />
        </section>

        {/* Position Info */}
        {selectedField && (
          <section className="space-y-4 bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Geometria
              </span>
              <span className="text-[9px] font-bold text-primary px-1.5 py-0.5 bg-primary/10 rounded">
                Pág {selectedField.pageIndex + 1}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <GeoItem label="X" value={`${(selectedField.position.x * 100).toFixed(1)}%`} />
              <GeoItem label="Y" value={`${(selectedField.position.y * 100).toFixed(1)}%`} />
              <GeoItem label="W" value={`${(selectedField.position.width * 100).toFixed(1)}%`} />
              <GeoItem label="H" value={`${(selectedField.position.height * 100).toFixed(1)}%`} />
            </div>
          </section>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full h-12 rounded-2xl text-red-500 hover:text-red-600 hover:bg-red-50 font-black uppercase tracking-tight gap-2 mt-8"
          onClick={() =>
            confirm('Excluir campos permanentemente?') && deleteMutation.mutate(selectedFieldIds)
          }
          disabled={deleteMutation.isPending}
        >
          <Trash2 size={16} />
          Remover Seleção
        </Button>
      </div>
    </div>
  );
}

function GeoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-100 shadow-sm">
      <span className="text-[10px] font-black text-slate-300">{label}</span>
      <span className="text-[11px] font-bold text-slate-600">{value}</span>
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
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <Layers className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Repetição
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 bg-slate-100/50 p-1 rounded-2xl">
        <button
          onClick={() => setFieldScope(ids, 'global')}
          className={cn(
            'h-9 rounded-xl text-[10px] font-black uppercase transition-all',
            sharedScope === 'global'
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'text-slate-400 hover:text-slate-600 hover:bg-white/50',
          )}
        >
          Geral (1x)
        </button>
        <button
          onClick={() => setFieldScope(ids, 'item')}
          className={cn(
            'h-9 rounded-xl text-[10px] font-black uppercase transition-all',
            sharedScope === 'item'
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'text-slate-400 hover:text-slate-600 hover:bg-white/50',
          )}
        >
          Por Item (SX)
        </button>
      </div>

      {sharedScope === 'item' && (
        <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between px-1">
            <Label className="text-[10px] font-black uppercase text-slate-400">
              Slot de Posição (S0, S1...)
            </Label>
            {sharedSlot !== null && sharedSlot !== undefined && (
              <span className="text-[10px] font-black text-primary">S{sharedSlot}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={slotInput}
              onChange={(e) => setSlotInput(e.target.value)}
              className="flex-1 h-10 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-900"
            />
            <button
              disabled={slotInput === ''}
              onClick={() => {
                const n = parseInt(slotInput, 10);
                if (!isNaN(n) && n >= 0) {
                  setFieldSlot(ids, n);
                  setSlotInput('');
                }
              }}
              className="px-4 h-10 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-600 disabled:opacity-30 transition-colors"
            >
              Set
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Equipment Type Section ───────────────────────────────────────────────────

function EquipmentTypeSection({ selectedFields }: { selectedFields: EditorField[] }) {
  const { updateFields } = useEditorStore();
  const ids = selectedFields.map((f) => f.id);
  const sharedTipoId = allSame(selectedFields, (f) => f.config.tipoEquipamentoId) as
    | string
    | undefined;

  const { data: tipos, isLoading } = useQuery({
    queryKey: ['tipos-active'],
    queryFn: () => api.listTipos(1, 100),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <Settings className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Tipo de Equipamento
        </span>
      </div>
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase text-slate-400 px-1">
          Filtro do Slot (Modo Manual)
        </Label>
        {isLoading ? (
          <div className="h-10 flex items-center justify-center bg-slate-50 border-slate-200 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400">Carregando...</span>
          </div>
        ) : (
          <select
            value={sharedTipoId ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              const nome = tipos?.items?.find((t) => t.id === val)?.nome;
              const baseConfig = selectedFields[0]?.config;
              if (!baseConfig) return;
              // We use updateFields to batch update
              updateFields(ids, {
                config: {
                  ...baseConfig,
                  ...(val ? { tipoEquipamentoId: val } : {}),
                  ...(nome ? { tipoEquipamentoNome: nome } : {}),
                },
              });
            }}
            className="w-full h-10 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-900 px-3 outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Selecione um tipo...</option>
            {tipos?.items?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

// ─── Binding key section ─────────────────────────────────────────────────────

interface BindingSectionProps {
  selectedFields: EditorField[];
  setFieldBinding: (ids: string[], bindingKey: string | null) => void;
}

const BINDING_SUGGESTIONS: Record<FieldScope, string[]> = {
  item: ['eq.numero', 'eq.serie', 'eq.patrimonio', 'eq.modelo', 'eq.ip', 'eq.setor'],
  global: [
    'global.data.dia',
    'global.data.mes',
    'global.data.ano',
    'global.tecnico',
    'global.loja.nome',
    'global.assinatura',
  ],
};

function BindingSection({ selectedFields, setFieldBinding }: BindingSectionProps) {
  const ids = selectedFields.map((f) => f.id);
  const sharedBinding = allSame(selectedFields, (f) => f.bindingKey ?? '');
  const sharedScope = allSame(selectedFields, (f) => f.scope);
  const [value, setValue] = useState<string | null>(null);
  const current = value ?? sharedBinding ?? '';

  const suggestions = sharedScope ? BINDING_SUGGESTIONS[sharedScope] : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <LinkIcon className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Vínculo de Dados
        </span>
      </div>

      <div className="space-y-3">
        <Input
          placeholder="ex.: eq.numero"
          value={current}
          onChange={(e) => setValue(e.target.value)}
          className="bg-slate-50 border-slate-200 rounded-xl h-10 font-bold placeholder:text-slate-300 text-slate-900"
        />

        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setValue(s)}
                className="px-2 py-1 rounded-md bg-slate-50 border border-slate-100 text-[9px] font-bold text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors uppercase"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest bg-primary hover:bg-primary/90 text-white"
            disabled={current === (sharedBinding ?? '')}
            onClick={() => setFieldBinding(ids, current === '' ? null : current)}
          >
            Vincular
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-10 rounded-xl font-black text-[10px] uppercase text-slate-300 hover:text-slate-500"
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
    </div>
  );
}

function allSame<T, V>(items: T[], pick: (t: T) => V): V | null {
  if (items.length === 0) return null;
  const first = pick(items[0]!);
  for (let i = 1; i < items.length; i++) {
    if (pick(items[i]!) !== first) return null;
  }
  return first;
}
