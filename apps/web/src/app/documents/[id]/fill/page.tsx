'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Spinner, Badge } from '@regcheck/ui';
import { api } from '@/lib/api';
import { SignatureCanvas } from '@/components/document/signature-canvas';
import { useDocumentDraft } from '@/hooks/use-document-draft';
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

  const [currentAssignmentIdx, setCurrentAssignmentIdx] = useState(0);
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
    metadata?: { assignments?: ItemAssignment[] } | null;
    template: {
      fields: TemplateField[];
      repetitionConfig?: RepetitionConfig;
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
  } = useDocumentDraft(documentId, docData?.filledFields);

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
    () =>
      selectedSetorId
        ? allAssignments.filter((a) => a.setorId === selectedSetorId)
        : allAssignments,
    [allAssignments, selectedSetorId],
  );

  useEffect(() => { setCurrentAssignmentIdx(0); }, [selectedSetorId]);

  const currentAssignment = filteredAssignments[currentAssignmentIdx] ?? null;
  const currentItemIndex = currentAssignment?.itemIndex ?? 0;

  // ── Sorted fields ──────────────────────────────────────────────────────────
  const sortedFields = useMemo(() => {
    if (!docData) return [];
    return [...docData.template.fields]
      .map((f) => ({ ...f, type: f.type.toLowerCase() as FieldType }))
      .sort((a, b) => (FIELD_TYPE_ORDER[a.type] ?? 99) - (FIELD_TYPE_ORDER[b.type] ?? 99));
  }, [docData]);

  // ── PDF generation ─────────────────────────────────────────────────────────
  const [generationState, setGenerationState] = useState<
    'idle' | 'queuing' | 'generating' | 'done' | 'error'
  >('idle');

  // Sync generation state with document status on load
  useEffect(() => {
    if (!docData) return;
    if (docData.status === 'generating') setGenerationState('generating');
    else if (docData.status === 'generated') setGenerationState('done');
    else if (docData.status === 'error') setGenerationState('error');
  }, [docData?.status]);

  // Poll status while generating
  const { data: statusData } = useQuery({
    queryKey: ['document-status', documentId],
    queryFn: () => api.getDocumentStatus(documentId),
    enabled: generationState === 'generating',
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (!statusData) return;
    if (statusData.status === 'GENERATED' || statusData.status === 'generated') {
      setGenerationState('done');
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
    } else if (statusData.status === 'ERROR' || statusData.status === 'error') {
      setGenerationState('error');
    }
  }, [statusData, documentId, queryClient]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      await syncToServer();
      return api.generatePdf(documentId);
    },
    onMutate: () => setGenerationState('queuing'),
    onSuccess: () => setGenerationState('generating'),
    onError: () => setGenerationState('error'),
  });

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goPrev = useCallback(() => setCurrentAssignmentIdx((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(
    () => setCurrentAssignmentIdx((i) => Math.min(filteredAssignments.length - 1, i + 1)),
    [filteredAssignments.length],
  );

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? goNext() : goPrev();
    touchStartX.current = null;
  };

  const hasAssignments = allAssignments.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
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
        <Button
          size="sm"
          onClick={() => generateMutation.mutate()}
          disabled={generationState === 'queuing' || generationState === 'generating'}
        >
          {(generationState === 'queuing' || generationState === 'generating') ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : null}
          {generationState === 'queuing'
            ? 'Enfileirando…'
            : generationState === 'generating'
              ? 'Gerando PDF…'
              : generationState === 'done'
                ? 'Gerar novamente'
                : 'Gerar PDF'}
        </Button>
      </div>

      {/* Status bar */}
      <StatusBar
        isOnline={isOnline}
        syncStatus={syncStatus}
        pendingUploads={pendingUploads}
        hasPendingChanges={hasPendingChanges}
        onSyncNow={syncToServer}
      />

      {generationState === 'generating' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm flex items-center gap-2">
          <Spinner className="h-4 w-4 flex-shrink-0" />
          <span>
            PDF sendo gerado em segundo plano. Você pode fechar esta página e voltar depois — o PDF ficará disponível na lista de documentos.
          </span>
        </div>
      )}

      {generationState === 'done' && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center justify-between gap-2">
          <span>PDF gerado com sucesso.</span>
          <DownloadButton documentId={documentId} />
        </div>
      )}

      {generationState === 'error' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between gap-2">
          <span>Falha na geração do PDF. Tente novamente.</span>
          <Button size="sm" variant="outline" onClick={() => generateMutation.mutate()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Populate panel */}
      {!hasAssignments && (
        <PopulatePanel
          documentId={documentId}
          onPopulated={() => queryClient.invalidateQueries({ queryKey: ['document', documentId] })}
        />
      )}

      {/* Fill UI */}
      {hasAssignments && (
        <>
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
            <div className="space-y-4" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
              {/* Equipment info + top navigation */}
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
                  <Button variant="outline" size="sm" onClick={goPrev} disabled={currentAssignmentIdx === 0}>
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

              {/* Fields */}
              <div className="space-y-3">
                {sortedFields.map((field) => (
                  <FieldInput
                    key={`${field.id}_${currentItemIndex}`}
                    field={field}
                    value={getValue(field.id, currentItemIndex)}
                    fileKey={getFileKey(field.id, currentItemIndex)}
                    pendingBlob={getPendingBlobForField(field.id, currentItemIndex)}
                    onChange={(value) => updateField(field.id, currentItemIndex, value)}
                    onImageChange={(file) => updateImageField(field.id, currentItemIndex, file)}
                  />
                ))}
                {sortedFields.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum campo neste template.</p>
                )}
              </div>

              {/* Bottom navigation */}
              <div className="flex justify-between pt-2 border-t">
                <Button variant="outline" onClick={goPrev} disabled={currentAssignmentIdx === 0}>
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

          <RePopulatePanel
            documentId={documentId}
            onPopulated={() => queryClient.invalidateQueries({ queryKey: ['document', documentId] })}
          />
        </>
      )}
    </div>
  );
}

// ─── DownloadButton ───────────────────────────────────────────────────────────

function DownloadButton({ documentId }: { documentId: string }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const { downloadUrl } = await api.getDownloadUrl(documentId);
      window.open(downloadUrl, '_blank');
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="sm" onClick={handleDownload} disabled={loading}>
      {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
      Download PDF
    </Button>
  );
}

// ─── StatusBar ────────────────────────────────────────────────────────────────

function StatusBar({
  isOnline,
  syncStatus,
  pendingUploads,
  hasPendingChanges,
  onSyncNow,
}: {
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
  pendingUploads: number;
  hasPendingChanges: boolean;
  onSyncNow: () => void;
}) {
  if (isOnline && syncStatus === 'idle' && !hasPendingChanges && pendingUploads === 0) return null;

  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
        !isOnline
          ? 'border-amber-300 bg-amber-50 text-amber-800'
          : syncStatus === 'error'
            ? 'border-red-300 bg-red-50 text-red-800'
            : 'border-blue-200 bg-blue-50 text-blue-800'
      }`}
    >
      <div className="flex items-center gap-2">
        {!isOnline && (
          <>
            <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
            <span>Offline — alterações salvas localmente</span>
          </>
        )}
        {isOnline && syncStatus === 'syncing' && (
          <>
            <Spinner className="h-3 w-3" />
            <span>Sincronizando...</span>
          </>
        )}
        {isOnline && syncStatus === 'error' && <span>Erro ao sincronizar</span>}
        {isOnline && syncStatus === 'idle' && hasPendingChanges && (
          <span>Alterações não salvas</span>
        )}
        {pendingUploads > 0 && (
          <span className="ml-1">
            · {pendingUploads} foto{pendingUploads !== 1 ? 's' : ''} aguardando upload
          </span>
        )}
      </div>
      {isOnline && (hasPendingChanges || pendingUploads > 0) && syncStatus !== 'syncing' && (
        <button onClick={onSyncNow} className="underline font-medium text-xs">
          Sincronizar agora
        </button>
      )}
    </div>
  );
}

// ─── FieldInput ───────────────────────────────────────────────────────────────

interface FieldInputProps {
  field: TemplateField & { type: FieldType };
  value: string | boolean;
  fileKey?: string;
  pendingBlob?: Blob;
  onChange: (value: string | boolean) => void;
  onImageChange: (file: File) => void;
}

function FieldInput({ field, value, fileKey, pendingBlob, onChange, onImageChange }: FieldInputProps) {
  // Create a local object URL for pending blobs so we can show a preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingBlob) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(pendingBlob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingBlob]);

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
        <div className="space-y-2">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImageChange(file);
            }}
            className="text-sm w-full"
          />
          {previewUrl && (
            <img src={previewUrl} alt="preview" className="max-h-40 rounded border object-contain" />
          )}
          {fileKey && !previewUrl && (
            <p className="text-xs text-green-600">✓ Foto enviada ao servidor</p>
          )}
          {pendingBlob && !fileKey && (
            <p className="text-xs text-amber-600">⏳ Foto salva localmente, aguardando upload</p>
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

// ─── PopulatePanel ────────────────────────────────────────────────────────────

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
        {populateMutation.isPending ? (
          <><Spinner className="mr-2 h-4 w-4" />Carregando...</>
        ) : (
          'Carregar Equipamentos'
        )}
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
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-muted-foreground underline"
        >
          Recarregar equipamentos
        </button>
      </div>
    );
  }

  return (
    <div className="border-t pt-4 space-y-3">
      <p className="text-sm text-amber-700">
        ⚠️ Recarregar substituirá os dados pré-preenchidos atuais.
      </p>
      <PopulatePanel
        documentId={documentId}
        onPopulated={() => { setOpen(false); onPopulated(); }}
      />
      <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground underline">
        Cancelar
      </button>
    </div>
  );
}
