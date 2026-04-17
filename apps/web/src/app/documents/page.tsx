'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Button, Badge, Spinner } from '@regcheck/ui';
import { api } from '@/lib/api';

type DocStatus = 'draft' | 'in_progress' | 'completed' | 'generating' | 'generated' | 'error';

const STATUS_LABEL: Record<DocStatus, string> = {
  draft: 'Rascunho',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  generating: 'Gerando PDF…',
  generated: 'PDF gerado',
  error: 'Erro',
};

const STATUS_VARIANT: Record<DocStatus, 'default' | 'secondary' | 'destructive'> = {
  draft: 'secondary',
  in_progress: 'secondary',
  completed: 'secondary',
  generating: 'secondary',
  generated: 'default',
  error: 'destructive',
};

interface DocSummary {
  id: string;
  name: string;
  templateName: string;
  status: DocStatus;
  totalItems: number;
  completedItems: number;
}

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.listDocuments(),
    // Poll while any document is generating
    refetchInterval: (query) => {
      const items = (query.state.data as { items: DocSummary[] } | undefined)?.items ?? [];
      return items.some((d) => d.status === 'generating') ? 3000 : false;
    },
  });

  const docs = (data?.items as DocSummary[] | undefined) ?? [];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documentos</h1>
          <p className="text-muted-foreground">Documentos preenchidos a partir de templates</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Novo Documento</Button>
      </div>

      {showCreate && <CreateDocumentSection onDone={() => setShowCreate(false)} />}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-4">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{doc.name}</span>
                  <Badge variant={STATUS_VARIANT[doc.status]}>
                    {doc.status === 'generating' && <Spinner className="mr-1 h-3 w-3" />}
                    {STATUS_LABEL[doc.status] ?? doc.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Template: {doc.templateName} · {doc.totalItems} item{doc.totalItems !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <Link href={`/documents/${doc.id}/fill`}>
                  <Button variant="outline" size="sm">
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
                  <Button size="sm" disabled>
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
          ))}

          {docs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum documento encontrado.
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
    >
      {mutation.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
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
    <Button size="sm" onClick={handleDownload} disabled={loading}>
      {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
      Download PDF
    </Button>
  );
}

function DeleteButton({ documentId, onSuccess }: { documentId: string; onSuccess: () => void }) {
  const mutation = useMutation({
    mutationFn: () => api.deleteDocument(documentId),
    onSuccess,
    onError: (error: Error) => {
      if (error.message.includes('404') || error.message.includes('not found') || error.message.includes('Not Found')) {
        // Documento já foi excluído ou não existe, apenas atualiza a lista
        onSuccess();
      } else {
        alert(`Erro ao excluir documento: ${error.message}`);
      }
    },
  });

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir este documento?')) {
      mutation.mutate();
    }
  };

  return (
    <Button
      size="sm"
      variant="destructive"
      onClick={handleDelete}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
      Excluir
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

  const publishedTemplates = (templates?.items as Array<{ id: string; name: string; status: string }>)?.filter(
    (t) => t.status === 'published',
  );

  return (
    <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
      <div>
        <h3 className="font-medium">Novo Documento</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Após criar, use &quot;Preencher&quot; para carregar os equipamentos automaticamente.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Selecione template...</option>
          {publishedTemplates?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Nome do documento"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() => createMutation.mutate()}
          disabled={!templateId || !name || createMutation.isPending}
        >
          Criar Documento
        </Button>
        <Button variant="outline" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
