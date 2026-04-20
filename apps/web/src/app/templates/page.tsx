'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Edit, Trash2, FilePlus } from 'lucide-react';
import { Button, Badge, Spinner } from '@regcheck/ui';
import { api } from '@/lib/api';

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.listTemplates(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-muted-foreground">Gerencie seus templates de documentos</p>
        </div>
        <Button onClick={() => setShowUpload(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Template
        </Button>
      </div>

      {showUpload && <UploadSection onDone={() => setShowUpload(false)} />}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-4">
          {(data?.items as Array<{ id: string; name: string; description?: string; status: string; pageCount: number; fieldCount: number; version: number }>)?.map(
            (template) => (
              <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/editor/${template.id}`} className="font-medium hover:underline">
                      {template.name}
                    </Link>
                    <Badge variant={template.status === 'published' ? 'default' : 'secondary'}>
                      {template.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">v{template.version}</span>
                  </div>
                  {template.description && (
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {template.pageCount} pag. | {template.fieldCount} campos
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/editor/${template.id}`}>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Edit className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                  </Link>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMutation.mutate(template.id)}
                    disabled={deleteMutation.isPending}
                    className="gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir
                  </Button>
                </div>
              </div>
            ),
          )}

          {data?.items.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum template encontrado. Crie o primeiro!
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UploadSection({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleCreate = async () => {
    if (!file || !name) return;
    setUploading(true);

    try {
      const uploaded = await api.uploadPdf(file);
      await api.createTemplate({
        name,
        pdfFileKey: uploaded.fileKey,
      });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      onDone();
    } catch (err) {
      console.error('Failed to create template:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
      <h3 className="font-medium">Novo Template</h3>
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Nome do template"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm flex-1"
        />
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
      </div>
      <div className="flex gap-2">
        <Button onClick={handleCreate} disabled={!file || !name || uploading} className="gap-2">
          {uploading ? <Spinner className="h-4 w-4" /> : <FilePlus className="h-4 w-4" />}
          Criar Template
        </Button>
        <Button variant="outline" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
