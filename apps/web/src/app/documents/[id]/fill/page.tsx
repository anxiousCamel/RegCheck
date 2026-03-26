'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Spinner, Badge } from '@regcheck/ui';
import { api } from '@/lib/api';
import { SignatureCanvas } from '@/components/document/signature-canvas';
import { useAutosave } from '@/hooks/use-autosave';
import type { FieldType, FieldPosition, FieldConfig, RepetitionConfig } from '@regcheck/shared';
import type { LojaDTO, TipoEquipamentoDTO } from '@regcheck/shared';

interface TemplateField {
  id: string;
  type: string;
  pageIndex: number;
  position: FieldPosition;
  config: FieldConfig;
  repetitionGroupId?: string;
  repetitionIndex?: number;
}

interface FieldValue {
  fieldId: string;
  itemIndex: number;
  value: string | boolean;
  fileKey?: string;
}

interface ItemAssignment {
  itemIndex: number;
  setorId: string;
  setorNome: string;
  equipamentoId: string;
  numeroEquipamento: string;
}

const FIELD_TYPE_ORDER: Record<string, number> = {
  text: 0,
  image: 1,
  checkbox: 2,
  signature: 3,
};

export default function FillDocumentPage() {
  const params = useParams<{ id: string }>();
  const documentId = params.id;
  const queryClient = useQueryClient();

  const [fieldValues, setFieldValues] = useState<Map<string, FieldValue>>(new Map());
  const [currentAssignmentIdx, setCurrentAssignmentIdx] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [selectedSetorId, setSelectedSetorId] = useState<string | null>(null);

  // Touch handling for mobile swipe
  const touchStartX = useRef<number | null>(null);

  const { data: doc, isLoading } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => api.getDocument(documentId),
  });

  const docData = doc as {
    id: string;
    name: string;
    totalItems: number;
    status: string;
    metadata?: { assignments?: ItemAssignment[] } | null;
    template: {
      fields: TemplateField[];
      repetitionConfig?: RepetitionConfig;
      pdfFile: { pageCount: number };
    };
    filledFields: Array<{ fieldId: string; itemIndex: number; value: string; fileKey?: string }>;
  } | undefined;

  // Initialize field values from loaded data
  useEffect(() => {
    if (!docData?.filledFields) return;
    const map = new Map<string, FieldValue>();
    for (const f of docData.filledFields) {
      map.set(`${f.fieldId}_${f.itemIndex}`, {
        fieldId: f.fieldId,
        itemIndex: f.itemIndex,
        value: f.value,
        fileKey: f.fileKey,
      });
    }
    setFieldValues(map);
  }, [docData?.filledFields]);

  // Assignments from metadata
  const allAssignments: ItemAssignment[] = useMemo(
    () => docData?.metadata?.assignments ?? [],
    [docData?.metadata],
  );

  // Unique setores from assignments
  const setores = useMemo(() => {
    const seen = new Set<string>();
    return allAssignments.filter((a) => {
      if (seen.has(a.setorId)) return false;
      seen.add(a.setorId);
      return true;
    }).map((a) => ({ id: a.setorId, nome: a.setorNome }));
  }, [allAssignments]);

  // Filtered assignments based on selected setor
  const filteredAssignments = useMemo(
    () =>
      selectedSetorId
        ? allAssignments.filter((a) => a.setorId === selectedSetorId)
        : allAssignments,
    [allAssignments, selectedSetorId],
  );

  // Clamp currentAssignmentIdx when filter changes
  useEffect(() => {
    setCurrentAssignmentIdx(0);
  }, [selectedSetorId]);

  const currentAssignment = filteredAssignments[currentAssignmentIdx] ?? null;
  const currentItemIndex = currentAssignment?.itemIndex ?? 0;

  // Sort fields: text → image → checkbox → signature
  const sortedFields = useMemo(() => {
    if (!docData) return [];
    return [...docData.template.fields]
      .map((f) => ({ ...f, type: f.type.toLowerCase() as FieldType }))
      .sort(
        (a, b) =>
          (FIELD_TYPE_ORDER[a.type] ?? 99) - (FIELD_TYPE_ORDER[b.type] ?? 99),
      );
  }, [docData]);

  const updateValue = useCallback(
    (fieldId: string, itemIndex: number, value: string | boolean, fileKey?: string) => {
      setFieldValues((prev) => {
        const next = new Map(prev);
        next.set(`${fieldId}_${itemIndex}`, { fieldId, itemIndex, value, fileKey });
        return next;
      });
      setIsDirty(true);
    },
    [],
  );

  const getFieldValue = useCallback(
    (fieldId: string, itemIndex: number): string | boolean =>
      fieldValues.get(`${fieldId}_${itemIndex}`)?.value ?? '',
    [fieldValues],
  );

  // Autosave
  const saveMutation = useMutation({
    mutationFn: async () => {
      const fields = Array.from(fieldValues.values()).map((v) => ({
        fieldId: v.fieldId,
        itemIndex: v.itemIndex,
        value: v.value,
        fileKey: v.fileKey,
      }));
      if (fields.length > 0) {
        await api.saveFilledData(documentId, fields);
      }
    },
    onSuccess: () => setIsDirty(false),
  });

  useAutosave(fieldValues, isDirty, async () => {
    await saveMutation.mutateAsync();
  });

  // Generate PDF
  const generateMutation = useMutation({
    mutationFn: () => api.generatePdf(documentId),
  });

  // Navigation
  const goPrev = useCallback(() => {
    setCurrentAssignmentIdx((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentAssignmentIdx((i) => Math.min(filteredAssignments.length - 1, i + 1));
  }, [filteredAssignments.length]);

  // Touch / swipe on mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  };

  const hasAssignments = allAssignments.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{docData?.name ?? 'Preencher Documento'}</h1>
          {hasAssignments && (
            <p className="text-sm text-muted-foreground">
              {allAssignments.length} equipamento{allAssignments.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={!isDirty || saveMutation.isPending}
          >
            {saveMutation.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Salvar
          </Button>
          <Button
            size="sm"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            Gerar PDF
          </Button>
        </div>
      </div>

      {generateMutation.isSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          PDF em geração! Acompanhe na lista de documentos.
        </div>
      )}

      {/* Populate panel — shown when no equipment assigned yet */}
      {!hasAssignments && (
        <PopulatePanel documentId={documentId} onPopulated={() => {
          queryClient.invalidateQueries({ queryKey: ['document', documentId] });
        }} />
      )}

      {/* Fill UI — shown when equipment is assigned */}
      {hasAssignments && (
        <>
          {/* Setor filter */}
          {setores.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedSetorId === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedSetorId(null)}
              >
                Todos
              </Button>
              {setores.map((s) => (
                <Button
                  key={s.id}
                  variant={selectedSetorId === s.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSetorId(s.id)}
                >
                  {s.nome}
                </Button>
              ))}
            </div>
          )}

          {filteredAssignments.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum equipamento neste setor.</p>
          ) : (
            <div
              className="space-y-4"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Equipment info + navigation */}
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border">
                <div>
                  <p className="font-medium text-sm">
                    {currentAssignment?.setorNome} — {currentAssignment?.numeroEquipamento}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentAssignmentIdx + 1} de {filteredAssignments.length}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goPrev}
                    disabled={currentAssignmentIdx === 0}
                  >
                    ← Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goNext}
                    disabled={currentAssignmentIdx === filteredAssignments.length - 1}
                  >
                    Próximo →
                  </Button>
                </div>
              </div>

              {/* Fields for current item */}
              <div className="space-y-3">
                {sortedFields.map((field) => (
                  <FieldInput
                    key={field.id}
                    field={field}
                    itemIndex={currentItemIndex}
                    value={getFieldValue(field.id, currentItemIndex)}
                    fileKey={fieldValues.get(`${field.id}_${currentItemIndex}`)?.fileKey}
                    onChange={(value, fileKey) =>
                      updateValue(field.id, currentItemIndex, value, fileKey)
                    }
                  />
                ))}

                {sortedFields.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum campo definido neste template.
                  </p>
                )}
              </div>

              {/* Bottom navigation */}
              <div className="flex justify-between pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={goPrev}
                  disabled={currentAssignmentIdx === 0}
                >
                  ← Anterior
                </Button>
                <span className="self-center text-sm text-muted-foreground">
                  {currentAssignmentIdx + 1} / {filteredAssignments.length}
                </span>
                <Button
                  variant={currentAssignmentIdx === filteredAssignments.length - 1 ? 'default' : 'outline'}
                  onClick={goNext}
                  disabled={currentAssignmentIdx === filteredAssignments.length - 1}
                >
                  Próximo →
                </Button>
              </div>
            </div>
          )}

          {/* Re-populate option */}
          <RePopulatePanel documentId={documentId} onPopulated={() => {
            queryClient.invalidateQueries({ queryKey: ['document', documentId] });
          }} />
        </>
      )}
    </div>
  );
}

// ─── FieldInput ─────────────────────────────────────────────────────────────

interface FieldInputProps {
  field: TemplateField & { type: FieldType };
  itemIndex: number;
  value: string | boolean;
  fileKey?: string;
  onChange: (value: string | boolean, fileKey?: string) => void;
}

function FieldInput({ field, value, fileKey, onChange }: FieldInputProps) {
  return (
    <div className="space-y-1.5 border rounded-lg p-3 bg-card">
      <div className="flex items-center gap-2">
        <label className="font-medium text-sm">{field.config.label}</label>
        {field.config.required && (
          <Badge variant="destructive" className="text-xs px-1.5 py-0">
            Obrigatório
          </Badge>
        )}
      </div>

      {field.type === 'text' && (
        <input
          type="text"
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.config.placeholder ?? ''}
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          maxLength={field.config.maxLength}
        />
      )}

      {field.type === 'checkbox' && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`field-${field.id}`}
            checked={value === true || value === 'true'}
            onChange={(e) => onChange(String(e.target.checked))}
            className="h-5 w-5 rounded"
          />
          <label htmlFor={`field-${field.id}`} className="text-sm">
            {field.config.placeholder ?? 'Marcar'}
          </label>
        </div>
      )}

      {field.type === 'image' && (
        <div className="space-y-1.5">
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const result = await api.uploadImage(file, 'image');
              onChange(file.name, result.fileKey);
            }}
            className="text-sm w-full"
          />
          {fileKey && (
            <p className="text-xs text-green-600">✓ Imagem enviada</p>
          )}
        </div>
      )}

      {field.type === 'signature' && (
        <SignatureCanvas
          value={String(value || '')}
          onChange={(dataUrl) => onChange(dataUrl)}
        />
      )}
    </div>
  );
}

// ─── PopulatePanel ───────────────────────────────────────────────────────────

function PopulatePanel({
  documentId,
  onPopulated,
}: {
  documentId: string;
  onPopulated: () => void;
}) {
  const [tipoId, setTipoId] = useState('');
  const [lojaId, setLojaId] = useState('');
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const { data: tipos } = useQuery({
    queryKey: ['tipos-active'],
    queryFn: () => api.listActiveTipos(),
  });

  const { data: lojas } = useQuery({
    queryKey: ['lojas-active'],
    queryFn: () => api.listActiveLojas(),
  });

  const populateMutation = useMutation({
    mutationFn: () => api.populateDocument(documentId, { tipoId, lojaId }),
    onSuccess: onPopulated,
  });

  // Preview count when tipo+loja selected
  useEffect(() => {
    if (!tipoId || !lojaId) {
      setPreviewCount(null);
      return;
    }
    setIsLoadingPreview(true);
    api
      .listEquipamentos(1, 1, { tipoId, lojaId })
      .then((r) => setPreviewCount((r as { total: number }).total))
      .catch(() => setPreviewCount(null))
      .finally(() => setIsLoadingPreview(false));
  }, [tipoId, lojaId]);

  return (
    <div className="p-4 border rounded-lg space-y-4 bg-muted/20">
      <div>
        <h3 className="font-semibold">Carregar Equipamentos</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Selecione o tipo de equipamento e a loja para pré-preencher este documento.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Tipo de Equipamento</label>
          <select
            value={tipoId}
            onChange={(e) => setTipoId(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Selecione...</option>
            {(tipos as TipoEquipamentoDTO[] | undefined)?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Loja</label>
          <select
            value={lojaId}
            onChange={(e) => setLojaId(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Selecione...</option>
            {(lojas as LojaDTO[] | undefined)?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {tipoId && lojaId && (
        <div className="text-sm">
          {isLoadingPreview ? (
            <span className="text-muted-foreground">Buscando...</span>
          ) : previewCount !== null ? (
            <span className={previewCount > 0 ? 'text-green-700' : 'text-red-600'}>
              {previewCount > 0
                ? `${previewCount} equipamento${previewCount !== 1 ? 's' : ''} encontrado${previewCount !== 1 ? 's' : ''}`
                : 'Nenhum equipamento encontrado'}
            </span>
          ) : null}
        </div>
      )}

      {populateMutation.isError && (
        <p className="text-sm text-red-600">
          {(populateMutation.error as Error)?.message ?? 'Erro ao carregar equipamentos'}
        </p>
      )}

      <Button
        onClick={() => populateMutation.mutate()}
        disabled={!tipoId || !lojaId || previewCount === 0 || populateMutation.isPending}
      >
        {populateMutation.isPending ? (
          <>
            <Spinner className="mr-2 h-4 w-4" />
            Carregando...
          </>
        ) : (
          'Carregar Equipamentos'
        )}
      </Button>
    </div>
  );
}

// ─── RePopulatePanel ─────────────────────────────────────────────────────────

function RePopulatePanel({
  documentId,
  onPopulated,
}: {
  documentId: string;
  onPopulated: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="pt-2">
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="text-muted-foreground">
          Recarregar equipamentos
        </Button>
      </div>
    );
  }

  return (
    <div className="border-t pt-4">
      <p className="text-sm text-amber-700 mb-3">
        ⚠️ Recarregar irá substituir todos os dados pré-preenchidos atuais.
      </p>
      <PopulatePanel documentId={documentId} onPopulated={() => { setOpen(false); onPopulated(); }} />
      <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="mt-2">
        Cancelar
      </Button>
    </div>
  );
}
