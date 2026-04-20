'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Button, Badge, Spinner, cn } from '@regcheck/ui';
import { api } from '@/lib/api';
import { Plus, ClipboardEdit, FileText, Download, Trash2, FilePlus } from 'lucide-react';

type DocStatus = 'draft' | 'in_progress' | 'completed' | 'generating' | 'generated' | 'error';

const STATUS_LABEL: Record<DocStatus, string> = {
  draft: 'Rascunho',
  in_progress: 'Em andamento',
  completed: 'Preenchido',
  generating: 'Processando…',
  generated: 'Disponível',
  error: 'Falha',
};

const STATUS_COLOR: Record<DocStatus, string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  in_progress: 'bg-blue-100 text-blue-600 border-blue-200',
  completed: 'bg-indigo-100 text-indigo-600 border-indigo-200',
  generating: 'bg-amber-100 text-amber-600 border-amber-200',
  generated: 'bg-green-100 text-green-700 border-green-200',
  error: 'bg-red-100 text-red-600 border-red-200',
};

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.listDocuments(),
    refetchInterval: (query) => {
      const items = (query.state.data as { items: DocSummary[] } | undefined)?.items ?? [];
      return items.some((d) => d.status === 'generating') ? 3000 : false;
    },
  });

  const docs = (data?.items as DocSummary[] | undefined) ?? [];

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-background/50">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase">Documentos</h1>
          <p className="text-sm text-muted-foreground font-medium">Relatórios e preventivas geradas pelo sistema</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="w-full sm:w-auto h-12 sm:h-10 gap-2 font-bold shadow-lg shadow-primary/20">
          <Plus className="h-5 w-5" />
          Novo Documento
        </Button>
      </div>

      {showCreate && <CreateDocumentSection onDone={() => setShowCreate(false)} />}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Spinner className="h-10 w-10 text-primary" />
          <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Buscando documentos...</span>
        </div>
      ) : (
        <div className="grid gap-4">
          {docs.map((doc) => {
             // Calculate progress and cap at 100% to avoid "820%" issues
             const rawProgress = doc.totalItems > 0 ? (doc.completedItems / doc.totalItems) * 100 : 0;
             const progress = Math.min(100, Math.max(0, rawProgress));
             const isDone = doc.status === 'generated' || progress === 100;
             
             return (
              <div key={doc.id} className="flex flex-col p-5 border-2 rounded-3xl bg-card hover:border-primary/30 transition-all shadow-sm gap-5 group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="text-lg font-black tracking-tight uppercase">{doc.name}</span>
                      <Badge className={cn("font-bold text-[10px] uppercase border shadow-none", STATUS_COLOR[doc.status])}>
                        {doc.status === 'generating' && <Spinner className="mr-1.5 h-3 w-3" />}
                        {STATUS_LABEL[doc.status] ?? doc.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                       <FileText className="h-3 w-3" />
                       <span>{doc.templateName}</span>
                       <span className="text-muted-foreground/30">·</span>
                       <span>{doc.totalItems} {doc.totalItems === 1 ? 'Equipamento' : 'Equipamentos'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link href={`/documents/${doc.id}/fill`} className="flex-1 sm:flex-none">
                      <Button variant="outline" size="sm" className="w-full h-11 sm:h-9 border-2 font-bold gap-2">
                        <ClipboardEdit className="h-4 w-4" />
                        Preencher
                      </Button>
                    </Link>

                    {(doc.status === 'in_progress' || doc.status === 'completed' || doc.status === 'error') && (
                      <GenerateButton
                        documentId={doc.id}
                        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['documents'] })}
                      />
                    )}

                    {doc.status === 'generating' && (
                      <Button size="sm" disabled className="flex-1 sm:flex-none h-11 sm:h-9 font-bold bg-amber-50 text-amber-600 border-amber-200">
                        <Spinner className="mr-2 h-4 w-4" />
                        Gerando…
                      </Button>
                    )}

                    {doc.status === 'generated' && (
                      <DownloadButton documentId={doc.id} />
                    )}

                    <DeleteButton
                      documentId={doc.id}
                      onSuccess={() => queryClient.invalidateQueries({ queryKey: ['documents'] })}
                    />
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                   <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">
                      <span>Progresso de Preenchimento</span>
                      <span>{Math.round(progress)}%</span>
                   </div>
                   <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all duration-1000 ease-out rounded-full",
                          progress === 100 ? "bg-green-500" : "bg-primary"
                        )}
                        style={{ width: `${progress}%` }}
                      />
                   </div>
                </div>
              </div>
             );
          })}

          {docs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border-2 border-dashed rounded-3xl bg-muted/20">
              <div className="p-4 rounded-full bg-muted text-muted-foreground">
                 <FilePlus className="h-10 w-10" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-lg">Nenhum documento gerado</p>
                <p className="text-sm text-muted-foreground">Crie um documento a partir de um template para começar.</p>
              </div>
              <Button onClick={() => setShowCreate(true)} variant="outline" className="font-bold border-2">
                 Novo Documento
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GenerateButton({ documentId, onSuccess }: { documentId: string; onSuccess: () => void }) {
  const mutation = useMutation({
    mutationFn: () => api.generatePdf(documentId),
    onSuccess,
  });

  return (
    <Button
      size="sm"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className="flex-1 sm:flex-none h-11 sm:h-9 font-bold gap-2 bg-primary text-white"
    >
      {mutation.isPending ? <Spinner className="h-4 w-4" /> : <FilePlus className="h-4 w-4" />}
      Gerar PDF
    </Button>
  );
}

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
    <Button size="sm" onClick={handleDownload} disabled={loading} className="flex-1 sm:flex-none h-11 sm:h-9 font-bold gap-2 bg-green-600 hover:bg-green-700 text-white border-green-700 shadow-md">
      {loading ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
      Baixar PDF
    </Button>
  );
}

function DeleteButton({ documentId, onSuccess }: { documentId: string; onSuccess: () => void }) {
  const mutation = useMutation({
    mutationFn: () => api.deleteDocument(documentId),
    onSuccess,
    onError: (error: Error) => {
      if (error.message.includes('404') || error.message.includes('not found')) {
        onSuccess();
      } else {
        alert(`Erro ao excluir: ${error.message}`);
      }
    },
  });

  return (
    <Button
      size="sm"
      variant="destructive"
      onClick={() => confirm('Excluir documento permanentemente?') && mutation.mutate()}
      disabled={mutation.isPending}
      className="h-11 sm:h-9 px-4"
    >
      {mutation.isPending ? <Spinner className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}

function CreateDocumentSection({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [templateId, setTemplateId] = useState('');
  const [name, setName] = useState('');

  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.listTemplates(),
  });

  const createMutation = useMutation({
    mutationFn: () => api.createDocument({ templateId, name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      onDone();
    },
  });

  const publishedTemplates = (templates?.items as any)?.filter((t: any) => t.status === 'published');

  return (
    <div className="p-6 border-2 border-primary/20 rounded-3xl space-y-6 bg-primary/[0.02] animate-in fade-in slide-in-from-top-4 duration-300 shadow-xl">
      <div className="flex items-center gap-3 border-b border-primary/10 pb-4">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
           <Plus className="h-5 w-5" />
        </div>
        <h3 className="font-black uppercase tracking-tight text-lg">Configurar Novo Documento</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-muted-foreground px-1 tracking-wider">Modelo PDF</label>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="flex h-12 w-full rounded-xl border-2 border-input bg-background px-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          >
            <option value="">Selecione um template...</option>
            {publishedTemplates?.map((t: any) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-muted-foreground px-1 tracking-wider">Identificação do Doc</label>
          <input
            type="text"
            placeholder="Ex: Preventiva - Abril/2024"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex h-12 w-full rounded-xl border-2 border-input bg-background px-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          onClick={() => createMutation.mutate()}
          disabled={!templateId || !name || createMutation.isPending}
          className="h-12 flex-1 font-bold gap-2 text-base shadow-lg shadow-primary/20"
        >
          {createMutation.isPending ? <Spinner className="h-5 w-5 text-white" /> : <FilePlus className="h-5 w-5" />}
          Iniciar Preenchimento
        </Button>
        <Button variant="ghost" onClick={onDone} className="h-12 font-bold text-muted-foreground">
          Cancelar
        </Button>
      </div>
    </div>
  );
}
