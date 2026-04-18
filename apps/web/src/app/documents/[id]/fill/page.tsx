'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Spinner } from '@regcheck/ui';
import { api } from '@/lib/api';
import { useDocumentDraft } from '@/hooks/use-document-draft';
import type { FieldType, FieldPosition, FieldConfig, LojaDTO, TipoEquipamentoDTO } from '@regcheck/shared';
import { Wizard, FillListScreen, EquipmentStep } from '@/components/document/fill-wizard';

interface TemplateField {
  id: string;
  type: string;
  pageIndex: number;
  position: FieldPosition;
  config: FieldConfig;
  scope: string;
  slotIndex: number | null;
  bindingKey: string | null;
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

const sortFields = (a: { type: FieldType }, b: { type: FieldType }) =>
  (FIELD_TYPE_ORDER[a.type] ?? 99) - (FIELD_TYPE_ORDER[b.type] ?? 99);

export default function FillDocumentPage() {
  const params = useParams<{ id: string }>();
  const documentId = params.id;
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0); // 0 = Global, 1..N = Equipment
  const [selectedSetorId, setSelectedSetorId] = useState<string | null>(null);

  const { data: doc, isLoading } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => api.getDocument(documentId),
  });

  const docData = doc as {
    id: string;
    name: string;
    totalItems: number;
    status: string;
    metadata?: { assignments?: ItemAssignment[]; itemsPerPage?: number; totalPages?: number } | null;
    template: {
      fields: TemplateField[];
      pdfFile: { pageCount: number };
    };
    filledFields: Array<{ fieldId: string; itemIndex: number; value: string; fileKey?: string }>;
  } | undefined;

  // ── Offline-first draft ────────────────────────────────────────────────────
  const {
    getValue,
    updateField,
    updateImageField,
    syncToServer,
    isOnline,
    pendingUploads,
    hasPendingChanges,
  } = useDocumentDraft(documentId, docData?.filledFields);

  // ── Fields split by scope ──────────────────────────────────────────────────
  const { globalFields, slotMap } = useMemo(() => {
    if (!docData) {
      return {
        globalFields: [] as (TemplateField & { type: FieldType })[],
        slotMap: new Map<number, (TemplateField & { type: FieldType })[]>(),
      };
    }

    const typed = docData.template.fields.map((f) => ({
      ...f,
      type: f.type.toLowerCase() as FieldType,
    }));

    const gFields = typed.filter((f) => f.scope === 'global').sort(sortFields);
    const iFields = typed.filter((f) => f.scope === 'item');

    // Group item fields by slotIndex for easy lookup.
    const sMap = new Map<number, typeof iFields>();
    for (const f of iFields) {
      if (f.slotIndex === null) continue;
      if (!sMap.has(f.slotIndex)) sMap.set(f.slotIndex, []);
      sMap.get(f.slotIndex)!.push(f);
    }
    for (const [, arr] of sMap) arr.sort(sortFields);

    return { globalFields: gFields, slotMap: sMap };
  }, [docData]);

  // ── Assignments ────────────────────────────────────────────────────────────
  const allAssignments: ItemAssignment[] = useMemo(
    () => docData?.metadata?.assignments ?? [],
    [docData?.metadata],
  );

  const setores = useMemo(() => {
    const seen = new Set<string>();
    return allAssignments
      .filter((a) => {
        if (seen.has(a.setorId)) return false;
        seen.add(a.setorId);
        return true;
      })
      .map((a) => ({ id: a.setorId, nome: a.setorNome }));
  }, [allAssignments]);

  const filteredAssignments = useMemo(
    () => selectedSetorId ? allAssignments.filter((a) => a.setorId === selectedSetorId) : allAssignments,
    [allAssignments, selectedSetorId],
  );

  useEffect(() => { setStep(0); }, [selectedSetorId]);

  const currentAssignment = filteredAssignments[step - 1] ?? null;
  const currentItemIndex = currentAssignment?.itemIndex ?? 0;

  // Derive how many SX slots per page from the slotMap.
  const itemsPerPage = slotMap.size;
  // Current slot = which SX position this item occupies on its page.
  const currentSlot = itemsPerPage > 0 ? currentItemIndex % itemsPerPage : 0;
  const currentSlotFields = slotMap.get(currentSlot) ?? [];

  // ── PDF generation ─────────────────────────────────────────────────────────
  const [generationState, setGenerationState] = useState<
    'idle' | 'queuing' | 'generating' | 'done' | 'error'
  >('idle');
  const [pollCount, setPollCount] = useState(0);
  const MAX_POLL_COUNT = 100;

  useEffect(() => {
    if (!docData) return;
    const status = docData.status?.toLowerCase();
    if (status === 'generating') setGenerationState('generating');
    else if (status === 'generated') setGenerationState('done');
    else if (status === 'error') setGenerationState('error');
  }, [docData?.status]);

  const { data: statusData } = useQuery({
    queryKey: ['document-status', documentId],
    queryFn: () => { setPollCount((c) => c + 1); return api.getDocumentStatus(documentId); },
    enabled: generationState === 'generating' && pollCount < MAX_POLL_COUNT,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (!statusData) return;
    const status = statusData.status?.toUpperCase();
    if (status === 'GENERATED') {
      setGenerationState('done');
      setPollCount(0);
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
    } else if (status === 'ERROR') {
      setGenerationState('error');
      setPollCount(0);
    }
  }, [statusData, documentId, queryClient]);

  useEffect(() => {
    if (pollCount >= MAX_POLL_COUNT && generationState === 'generating') {
      setGenerationState('error');
      setPollCount(0);
    }
  }, [pollCount, generationState]);

  const generateMutation = useMutation({
    mutationFn: async () => { await syncToServer(); return api.generatePdf(documentId); },
    onMutate: () => { setGenerationState('queuing'); setPollCount(0); },
    onSuccess: () => setGenerationState('generating'),
    onError: () => setGenerationState('error'),
  });

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goPrev = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);
  const goNext = useCallback(
    () => setStep((s) => Math.min(filteredAssignments.length, s + 1)),
    [filteredAssignments.length],
  );


  const hasAssignments = allAssignments.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24" style={{ background: 'var(--rc-bg)', minHeight: '100vh' }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--rc-bg)' }}>
      {!hasAssignments ? (
        <div className="p-4 max-w-lg mx-auto pt-8">
          <h1 className="text-xl font-extrabold mb-4">{docData?.name ?? 'Preencher Documento'}</h1>
          <PopulatePanel
            documentId={documentId}
            onPopulated={() => queryClient.invalidateQueries({ queryKey: ['document', documentId] })}
          />
        </div>
      ) : (
        <Wizard
          step={step}
          totalSteps={1 + filteredAssignments.length}
          onNext={goNext}
          onPrev={goPrev}
          onFinish={() => generateMutation.mutate()}
        >
          {step === 0 ? (
            <FillListScreen
              docName={docData?.name ?? 'Preencher Documento'}
              allAssignments={allAssignments}
              filteredAssignments={filteredAssignments}
              setores={setores}
              selectedSetorId={selectedSetorId}
              onSetSetor={setSelectedSetorId}
              onStartFilling={goNext}
              onGenerate={() => generateMutation.mutate()}
              generationState={generationState}
              globalFields={globalFields as unknown as import('@regcheck/shared').TemplateField[]}
              getValue={getValue}
              updateField={updateField}
              isOnline={isOnline}
              pendingUploads={pendingUploads}
              hasPendingChanges={hasPendingChanges}
              onSyncNow={syncToServer}
              documentId={documentId}
              onPopulated={() => queryClient.invalidateQueries({ queryKey: ['document', documentId] })}
              repopulateSlot={
                <RePopulatePanel
                  documentId={documentId}
                  onPopulated={() => queryClient.invalidateQueries({ queryKey: ['document', documentId] })}
                />
              }
            />
          ) : (
            <EquipmentStep
              assignment={filteredAssignments[step - 1]!}
              index={step - 1}
              total={filteredAssignments.length}
              fields={currentSlotFields as unknown as import('@regcheck/shared').TemplateField[]}
              getValue={getValue}
              updateField={updateField}
              onImageChange={updateImageField}
              onNext={step === filteredAssignments.length ? () => generateMutation.mutate() : goNext}
              onPrev={goPrev}
              isLast={step === filteredAssignments.length}
              isOnline={isOnline}
              pendingUploads={pendingUploads}
            />
          )}
        </Wizard>
      )}
    </div>
  );
}

// ─── PopulatePanel ────────────────────────────────────────────────────────────

function PopulatePanel({ documentId, onPopulated }: { documentId: string; onPopulated: () => void }) {
  const [tipoId, setTipoId] = useState('');
  const [lojaId, setLojaId] = useState('');
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const { data: tipos } = useQuery({ queryKey: ['tipos-active'], queryFn: () => api.listActiveTipos() });
  const { data: lojas } = useQuery({ queryKey: ['lojas-active'], queryFn: () => api.listActiveLojas() });

  const populateMutation = useMutation({
    mutationFn: () => api.populateDocument(documentId, { tipoId, lojaId }),
    onSuccess: onPopulated,
  });

  useEffect(() => {
    if (!tipoId || !lojaId) { setPreviewCount(null); return; }
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
          Selecione o tipo e a loja para pré-preencher este documento automaticamente.
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
              <option key={t.id} value={t.id}>{t.nome}</option>
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
              <option key={l.id} value={l.id}>{l.nome}</option>
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
        {populateMutation.isPending ? <><Spinner className="mr-2 h-4 w-4" />Carregando...</> : 'Carregar Equipamentos'}
      </Button>
    </div>
  );
}

// ─── RePopulatePanel ──────────────────────────────────────────────────────────

function RePopulatePanel({ documentId, onPopulated }: { documentId: string; onPopulated: () => void }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="pt-2">
        <button onClick={() => setOpen(true)} className="text-xs text-muted-foreground underline">
          Recarregar equipamentos
        </button>
      </div>
    );
  }

  return (
    <div className="border-t pt-4 space-y-3">
      <p className="text-sm text-amber-700">⚠️ Recarregar substituirá os dados pré-preenchidos atuais.</p>
      <PopulatePanel documentId={documentId} onPopulated={() => { setOpen(false); onPopulated(); }} />
      <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground underline">Cancelar</button>
    </div>
  );
}
