'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Spinner, Badge } from '@regcheck/ui';
import { api } from '@/lib/api';
import { SignatureCanvas } from '@/components/document/signature-canvas';
import { useDocumentDraft } from '@/hooks/use-document-draft';
import type { FieldType, FieldPosition, FieldConfig } from '@regcheck/shared';
import type { LojaDTO, TipoEquipamentoDTO, ItemAssignment } from '@regcheck/shared';
import { Wizard, GlobalForm, EquipmentStep } from '@/components/document/fill-wizard';
import { IconCheck, IconX, IconList } from '@/components/ui/icons'; 

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
    getFileKey,
    getPendingBlobForField,
    updateField,
    updateImageField,
    syncToServer,
    isOnline,
    syncStatus,
    pendingUploads,
    hasPendingChanges,
    fields,
  } = useDocumentDraft(documentId, docData?.filledFields);

  // ── Fields split by scope ──────────────────────────────────────────────────
  const { globalFields, itemFields, slotMap } = useMemo(() => {
    if (!docData) {
      return {
        globalFields: [] as (TemplateField & { type: FieldType })[],
        itemFields: [] as (TemplateField & { type: FieldType })[],
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

    return { globalFields: gFields, itemFields: iFields, slotMap: sMap };
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
    () => (selectedSetorId ? allAssignments.filter((a) => a.setorId === selectedSetorId) : allAssignments),
    [allAssignments, selectedSetorId],
  );

  const currentAssignment = filteredAssignments[step - 1] ?? null;
  const currentItemIndex = currentAssignment?.itemIndex ?? 0;

  // Calculate actual progress based on filled fields
  const completionPercentage = useMemo(() => {
    // fields per item (all slots) + global fields
    const fieldsPerItem = itemFields.length;
    const totalFieldsInDoc = (allAssignments.length * fieldsPerItem) + globalFields.length;
    
    if (totalFieldsInDoc === 0) return 0;
    
    // Count non-empty values in the current draft Map
    let filledCount = 0;
    fields.forEach(f => {
      if (f.value !== '' && f.value !== null && f.value !== false) {
        filledCount++;
      }
    });
    
    return Math.min(100, Math.round((filledCount / totalFieldsInDoc) * 100));
  }, [fields, allAssignments.length, itemFields.length, globalFields.length]);

  useEffect(() => { 
    // If we are already in the equipment steps, jump to the first one of the new filter
    // If we are in global info (0), stay there.
    if (step > 0) setStep(1); 
  }, [selectedSetorId]);

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
  const isGlobalStep = step === 0;

  // Equipment selection list for the "Jump to" feature
  const [showIndex, setShowIndex] = useState(false);

  if (isLoading) {
    return <div className="flex items-center justify-center py-24"><Spinner /></div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-2xl mx-auto pb-32">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-extrabold tracking-tight">
          {docData?.name ?? 'Preencher Documento'}
        </h1>
        <div className="flex items-center gap-2">
          <StatusBar
            isOnline={isOnline}
            syncStatus={syncStatus}
            pendingUploads={pendingUploads}
            hasPendingChanges={hasPendingChanges}
            onSyncNow={syncToServer}
            compact
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => generateMutation.mutate()}
            disabled={generationState === 'queuing' || generationState === 'generating'}
            className="font-bold border-2"
          >
            {(generationState === 'queuing' || generationState === 'generating') ? (
              <Spinner className="mr-2 h-4 w-4" />
            ) : null}
            Finalizar e Gerar
          </Button>
        </div>
      </div>

      {/* Sector Filter - Always available if we have assignments */}
      {hasAssignments && (
        <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
            <Button
              variant={selectedSetorId === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedSetorId(null)}
              className="rounded-full px-4 h-8 text-xs shrink-0"
            >
              Todos Setores
            </Button>
            {setores.map((s) => (
              <Button
                key={s.id}
                variant={selectedSetorId === s.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedSetorId(s.id)}
                className="rounded-full px-4 h-8 text-xs whitespace-nowrap shrink-0"
              >
                {s.nome}
              </Button>
            ))}
          </div>
        </div>
      )}

      {generationState === 'generating' && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-primary text-sm font-medium animate-pulse">
          Gerando PDF... Você pode continuar trabalhando.
        </div>
      )}

      {generationState === 'done' && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center justify-between gap-2 shadow-sm">
          <span className="font-bold flex items-center gap-2"><IconCheck className="h-4 w-4" /> PDF Pronto</span>
          <DownloadButton documentId={documentId} />
        </div>
      )}

      {generationState === 'error' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between gap-2 shadow-sm">
          <span className="font-bold">Erro na geração</span>
          <Button size="sm" variant="outline" onClick={() => generateMutation.mutate()}>Tentar novamente</Button>
        </div>
      )}

      {!hasAssignments ? (
        <PopulatePanel
          documentId={documentId}
          onPopulated={() => queryClient.invalidateQueries({ queryKey: ['document', documentId] })}
        />
      ) : (
        <Wizard 
          step={step} 
          totalSteps={1 + filteredAssignments.length} 
          progress={completionPercentage} // Pass the real progress here
          onNext={goNext} 
          onPrev={goPrev} 
          onFinish={() => generateMutation.mutate()}
        >
          {isGlobalStep ? (
            <div className="space-y-6">
              <GlobalForm 
                fields={globalFields}
                getValue={getValue}
                updateField={updateField}
                onNext={goNext}
              />
              
              <div className="pt-4 opacity-50">
                <RePopulatePanel
                  documentId={documentId}
                  onPopulated={() => queryClient.invalidateQueries({ queryKey: ['document', documentId] })}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Quick Jump Index */}
              <div className="flex justify-center -mt-2">
                <button 
                  onClick={() => setShowIndex(!showIndex)}
                  className="text-xs font-bold text-primary bg-primary/5 px-4 py-1.5 rounded-full hover:bg-primary/10 transition-colors flex items-center gap-2"
                >
                  <IconList className="h-3.5 w-3.5" />
                  {showIndex ? 'Ocultar Lista' : 'Ver Lista de Equipamentos'}
                </button>
              </div>

              {showIndex && (
                <div className="bg-muted/30 border rounded-xl p-2 grid grid-cols-2 sm:grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-2 duration-300 max-h-[300px] overflow-y-auto">
                    {filteredAssignments.map((a, i) => {
                      // Determine which slot this item occupies on the page (SX0, SX1, etc.)
                      const itemsPerPage = slotMap.size;
                      const currentSlot = itemsPerPage > 0 ? a.itemIndex % itemsPerPage : 0;
                      const slotFields = slotMap.get(currentSlot) ?? [];

                      // 1. Try to find an ID field within THIS specific slot with strict priority
                      const idField = slotFields.find(f => (f.bindingKey || '').toLowerCase().includes('numero')) ||
                                      slotFields.find(f => (f.bindingKey || '').toLowerCase().includes('tag')) ||
                                      slotFields.find(f => (f.bindingKey || '').toLowerCase().includes('patri')) ||
                                      slotFields.find(f => (f.bindingKey || '').toLowerCase().includes('serie'));
                      
                      const displayId = idField ? String(getValue(idField.id, a.itemIndex) || '') : '';
                      
                      // 2. Fallback to properties with same priority
                      const finalLabel = displayId || 
                                         (a as any).numeroEquipamento || 
                                         (a as any).numero || 
                                         (a as any).patrimonio || 
                                         (a as any).serie || 
                                         `Item ${a.itemIndex + 1}`;
                      
                      return (
                        <button
                          key={a.itemIndex}
                          onClick={() => { setStep(i + 1); setShowIndex(false); }}
                          className={`text-[10px] text-left p-2 rounded-lg border transition-all flex flex-col justify-between h-full ${
                            step === i + 1 
                              ? 'bg-primary text-white border-primary shadow-md' 
                              : 'bg-white hover:border-primary/50'
                          }`}
                        >
                          <div className="font-extrabold text-xs mb-1">
                            #{finalLabel}
                          </div>
                          <div className={`truncate text-[9px] opacity-80 ${step === i + 1 ? 'text-white/90' : 'text-muted-foreground'}`}>
                            {a.setorNome}
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}

              <EquipmentStep 
                assignment={filteredAssignments[step - 1]}
                index={step - 1}
                total={filteredAssignments.length}
                fields={currentSlotFields}
                getValue={getValue}
                updateField={updateField}
                onImageChange={updateImageField}
                onNext={step === filteredAssignments.length ? () => generateMutation.mutate() : goNext}
                onPrev={goPrev}
                isLast={step === filteredAssignments.length}
              />
            </div>
          )}
        </Wizard>
      )}
    </div>
  );
}

// ─── DownloadButton ───────────────────────────────────────────────────────────

function DownloadButton({ documentId }: { documentId: string }) {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      size="sm"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const { downloadUrl } = await api.getDownloadUrl(documentId);
          window.open(downloadUrl, '_blank');
        } catch (err) {
          console.error('Download failed:', err);
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
      Download PDF
    </Button>
  );
}

// ─── StatusBar ────────────────────────────────────────────────────────────────

function StatusBar({
  isOnline, syncStatus, pendingUploads, hasPendingChanges, onSyncNow, compact = false,
}: {
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
  pendingUploads: number;
  hasPendingChanges: boolean;
  onSyncNow: () => void;
  compact?: boolean;
}) {
  if (isOnline && syncStatus === 'idle' && !hasPendingChanges && pendingUploads === 0) return null;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
        !isOnline ? 'bg-amber-100 text-amber-700'
          : syncStatus === 'error' ? 'bg-red-100 text-red-700'
          : 'bg-blue-100 text-blue-700'
      }`}>
        {!isOnline ? 'Offline' : syncStatus === 'syncing' ? 'Sincronizando' : hasPendingChanges ? 'Pendente' : 'Salvo'}
        {pendingUploads > 0 && <span> · {pendingUploads} fotos</span>}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
      !isOnline ? 'border-amber-300 bg-amber-50 text-amber-800'
        : syncStatus === 'error' ? 'border-red-300 bg-red-50 text-red-800'
        : 'border-blue-200 bg-blue-50 text-blue-800'
    }`}>
      <div className="flex items-center gap-2">
        {!isOnline && <><span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /><span>Offline — alterações salvas localmente</span></>}
        {isOnline && syncStatus === 'syncing' && <><Spinner className="h-3 w-3" /><span>Sincronizando...</span></>}
        {isOnline && syncStatus === 'error' && <span>Erro ao sincronizar</span>}
        {isOnline && syncStatus === 'idle' && hasPendingChanges && <span>Alterações não salvas</span>}
        {pendingUploads > 0 && <span className="ml-1">· {pendingUploads} foto{pendingUploads !== 1 ? 's' : ''} aguardando upload</span>}
      </div>
      {isOnline && (hasPendingChanges || pendingUploads > 0) && syncStatus !== 'syncing' && (
        <button onClick={onSyncNow} className="underline font-medium text-xs">Sincronizar agora</button>
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
