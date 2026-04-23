'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Edit, Trash2, FilePlus, UploadCloud, LayoutTemplate } from 'lucide-react';
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
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">Templates</h1>
          <p className="text-sm text-muted-foreground font-medium">Gerencie seus modelos de documentos técnicos</p>
        </div>
        <Button onClick={() => setShowUpload(true)} className="w-full sm:w-auto h-12 sm:h-10 gap-2 font-bold shadow-lg shadow-primary/20">
          <Plus className="h-5 w-5" />
          Novo Template
        </Button>
      </div>

      {showUpload && <UploadSection onDone={() => setShowUpload(false)} />}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Spinner className="h-8 w-8 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Carregando modelos...</span>
        </div>
      ) : (
        <div className="grid gap-4">
          {(data?.items as Array<{ id: string; name: string; description?: string; status: string; pageCount: number; fieldCount: number; version: number }>)?.map(
            (template) => (
              <div key={template.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-2 rounded-2xl bg-card hover:border-primary/30 transition-all shadow-sm gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center flex-wrap gap-2">
                    <Link href={`/editor/${template.id}`} className="text-lg font-black hover:text-primary transition-colors uppercase tracking-tight">
                      {template.name}
                    </Link>
                    <Badge variant={template.status === 'published' ? 'default' : 'secondary'} className="font-bold uppercase text-[10px]">
                      {template.status}
                    </Badge>
                    <Badge variant="outline" className="font-bold text-[10px] border-primary/20 text-primary bg-primary/5">
                      v{template.version}
                    </Badge>
                  </div>
                  {template.description && (
                    <p className="text-sm text-muted-foreground font-medium leading-tight line-clamp-2">{template.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] font-bold text-muted-foreground/70 uppercase">
                    <span className="flex items-center gap-1"><FilePlus className="h-3 w-3" /> {template.pageCount} páginas</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span>{template.fieldCount} campos configurados</span>
                  </div>
                </div>
                <div className="flex flex-row sm:flex-row gap-2">
                  <Link href={`/editor/${template.id}`} className="flex-1 sm:flex-none">
                    <Button variant="outline" size="sm" className="w-full h-11 sm:h-9 border-2 font-bold gap-2">
                      <Edit className="h-4 w-4" />
                      Editar
                    </Button>
                  </Link>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm('Deseja realmente excluir este template?')) {
                        deleteMutation.mutate(template.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="flex-1 sm:flex-none h-11 sm:h-9 font-bold gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sm:hidden lg:inline">Excluir</span>
                  </Button>
                </div>
              </div>
            ),
          )}

          {data?.items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border-2 border-dashed rounded-3xl bg-muted/20">
              <div className="p-4 rounded-full bg-muted text-muted-foreground">
                 <LayoutTemplate className="h-10 w-10" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-lg">Nenhum template encontrado</p>
                <p className="text-sm text-muted-foreground">Comece importando um arquivo PDF base.</p>
              </div>
              <Button onClick={() => setShowUpload(true)} variant="outline" className="font-bold border-2">
                 Importar PDF
              </Button>
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
    <div className="p-6 border-2 border-primary/20 rounded-3xl space-y-5 bg-primary/[0.02] animate-in fade-in slide-in-from-top-4 duration-300 shadow-xl">
      <div className="flex items-center gap-3 border-b border-primary/10 pb-4">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
           <FilePlus className="h-5 w-5" />
        </div>
        <h3 className="font-black uppercase tracking-tight">Criar Novo Template</h3>
      </div>
      
      <div className="flex flex-col gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase text-muted-foreground px-1">Nome do Template</label>
          <input
            type="text"
            placeholder="Ex: Checklist de Preventiva - SX"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex h-12 w-full rounded-xl border-2 border-input bg-background px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase text-muted-foreground px-1">Arquivo PDF Base</label>
          <div className="relative h-14 border-2 border-dashed border-muted-foreground/30 rounded-xl bg-background flex items-center px-4 group hover:border-primary/50 transition-all">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="flex items-center gap-3 text-sm font-bold text-muted-foreground">
              <UploadCloud className="h-5 w-5 text-primary" />
              {file ? <span className="text-foreground truncate max-w-[200px]">{file.name}</span> : <span>Selecionar PDF...</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button onClick={handleCreate} disabled={!file || !name || uploading} className="h-12 flex-1 font-bold gap-2">
          {uploading ? <Spinner className="h-5 w-5 text-white" /> : <Plus className="h-5 w-5" />}
          Finalizar Importação
        </Button>
        <Button variant="ghost" onClick={onDone} className="h-12 font-bold text-muted-foreground">
          Cancelar
        </Button>
      </div>
    </div>
  );
}
