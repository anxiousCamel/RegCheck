'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Button, Badge, Spinner } from '@regcheck/ui';
import { api } from '@/lib/api';

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.listDocuments(),
  });

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
          {(data?.items as Array<{ id: string; name: string; templateName: string; status: string; totalItems: number; completedItems: number }>)?.map(
            (doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{doc.name}</span>
                    <Badge
                      variant={
                        doc.status === 'generated'
                          ? 'default'
                          : doc.status === 'error'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {doc.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Template: {doc.templateName} | {doc.totalItems} itens
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/documents/${doc.id}/fill`}>
                    <Button variant="outline" size="sm">
                      Preencher
                    </Button>
                  </Link>
                  {doc.status === 'generated' && (
                    <DownloadButton documentId={doc.id} />
                  )}
                </div>
              </div>
            ),
          )}

          {data?.items.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum documento encontrado.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DownloadButton({ documentId }: { documentId: string }) {
  const handleDownload = async () => {
    try {
      const { downloadUrl } = await api.getDownloadUrl(documentId);
      window.open(downloadUrl, '_blank');
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <Button size="sm" onClick={handleDownload}>
      Download PDF
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
