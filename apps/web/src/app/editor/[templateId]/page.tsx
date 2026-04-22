'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button, Spinner, cn } from '@regcheck/ui';
import { Save, Rocket, AlertCircle, X, ChevronLeft, Layers, Settings2, Eye } from 'lucide-react';
import { api } from '@/lib/api';
import { useEditorStore } from '@/stores/editor-store';
import { EditorCanvas } from '@/components/editor/editor-canvas';
import { EditorToolbar } from '@/components/editor/editor-toolbar';
import { FieldProperties } from '@/components/editor/field-properties';
import { PageNavigator } from '@/components/editor/page-navigator';
import { useAutosave } from '@/hooks/use-autosave';
import type { FieldType, FieldScope } from '@regcheck/shared';

export default function EditorPage() {
  const params = useParams<{ templateId: string }>();
  const router = useRouter();
  const templateId = params.templateId;

  const [showNav, setShowNav] = useState(false);
  const [showProps, setShowProps] = useState(false);
  const initializedRef = useRef(false);

  const { fields, isDirty, setFields, markClean, selectedFieldIds } = useEditorStore();

  // Auto-open properties panel when a field is selected
  useEffect(() => {
    if (selectedFieldIds.length > 0) {
      setShowProps(true);
    }
  }, [selectedFieldIds]);

  const { data: template, isLoading } = useQuery({
    queryKey: ['template', templateId],
    queryFn: () => api.getTemplate(templateId),
    enabled: !!templateId,
    gcTime: 0,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const currentFields = useEditorStore.getState().fields;
      const updates = currentFields.map((f) => ({
        id: f.id,
        position: f.position as unknown as Record<string, number>,
        config: f.config as unknown as Record<string, unknown>,
        scope: f.scope,
        slotIndex: f.slotIndex,
        bindingKey: f.bindingKey,
      }));
      markClean();
      await api.batchUpdatePositions(templateId, updates);
    },
    onError: () => {
      useEditorStore.setState({ isDirty: true });
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => api.publishTemplate(templateId),
  });

  useAutosave(fields, isDirty, async () => {
    await saveMutation.mutateAsync();
  });

  useEffect(() => {
    if (!template || initializedRef.current) return;
    const t = template as any;
    if (!Array.isArray(t.fields)) return;

    const editorFields = t.fields.map((f: any) => ({
      id: f.id,
      type: f.type.toLowerCase() as FieldType,
      pageIndex: f.pageIndex,
      position: f.position,
      config: f.config,
      scope: (f.scope as FieldScope) ?? 'item',
      slotIndex: f.slotIndex ?? null,
      bindingKey: f.bindingKey ?? null,
    }));

    setFields(editorFields);
    useEditorStore.getState().setTotalPages(t.pdfFile.pageCount);
    initializedRef.current = true;
  }, [template, setFields]);

  const templateData = template as { name: string; status: string; pdfFile: { fileKey: string } } | undefined;

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-900 overflow-hidden font-sans selection:bg-primary/20">
      {/* Premium Light Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 bg-white/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.back()}
            className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 p-1 h-8 w-8 rounded-full"
          >
            <ChevronLeft size={20} />
          </Button>
          <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />
          <div className="flex flex-col">
             <h1 className="text-sm font-black tracking-tight uppercase flex items-center gap-2">
               {templateData?.name ?? 'Editor de Template'}
               {templateData?.status === 'PUBLISHED' && (
                 <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">ATIVO</span>
               )}
             </h1>
             {isDirty && (
               <span className="text-[9px] text-amber-600 font-bold uppercase tracking-widest animate-pulse">
                 Sincronizando...
               </span>
             )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNav(!showNav)}
            className={cn(
              "lg:hidden h-9 px-3 rounded-xl transition-all",
              showNav ? "bg-primary text-white" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <Layers className="h-4 w-4 mr-2" />
            <span className="text-xs font-bold">Págs</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowProps(!showProps)}
            className={cn(
              "lg:hidden h-9 px-3 rounded-xl transition-all",
              showProps ? "bg-primary text-white" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <Settings2 className="h-4 w-4 mr-2" />
            <span className="text-xs font-bold">Props</span>
          </Button>

          <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!isDirty || saveMutation.isPending || isLoading}
            className={cn(
              "h-9 px-4 rounded-xl font-black text-xs uppercase tracking-tight transition-all active:scale-95 border-2",
              isDirty 
                ? "bg-white border-primary text-primary hover:bg-primary/5 shadow-sm" 
                : "bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed shadow-none"
            )}
          >
            {saveMutation.isPending ? <Spinner className="h-3 w-3" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>

          <Button
            onClick={() => publishMutation.mutate()}
            disabled={templateData?.status === 'PUBLISHED' || publishMutation.isPending || isLoading}
            className="h-9 px-4 rounded-xl font-black text-xs uppercase tracking-tight bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95"
          >
            {publishMutation.isPending ? <Spinner className="h-3 w-3" /> : <Rocket className="h-4 w-4 mr-2" />}
            Publicar
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Workspace Layout */}
        <div className="flex flex-1 overflow-hidden bg-[#f1f5f9] relative">
          
          {/* Floating Left Panel (Page Navigator) */}
          <div className={cn(
            "absolute lg:relative inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 transition-all duration-300 transform shadow-2xl lg:shadow-none",
            !showNav && "-translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 lg:overflow-hidden"
          )}>
            <div className="h-full flex flex-col p-4 bg-white">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Páginas</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowNav(false)} className="lg:hidden h-8 w-8 p-0"><X size={16} /></Button>
               </div>
               <div className="flex-1 overflow-y-auto scrollbar-hide">
                 <PageNavigator />
               </div>
            </div>
          </div>

          {/* Canvas Area (Central Focus) */}
          <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-100">
            {/* Toolbar - Light style floating */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
               <EditorToolbar templateId={templateId} />
            </div>

            <div className="flex-1 overflow-auto scrollbar-hide flex items-center justify-center p-8 sm:p-20 pt-24 sm:pt-28">
              {isLoading ? (
                <div className="flex flex-col items-center gap-4">
                  <Spinner className="w-12 h-12 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Preparando Ambiente</span>
                </div>
              ) : (
                <div className="relative shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-sm">
                  <EditorCanvas
                    pdfFileKey={templateData?.pdfFile.fileKey ?? ''}
                    templateId={templateId}
                    isPublished={templateData?.status === 'PUBLISHED'}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Floating Right Panel (Properties) */}
          <div className={cn(
            "absolute lg:relative inset-y-0 right-0 z-40 w-80 bg-white border-l border-slate-200 transition-all duration-300 transform shadow-2xl lg:shadow-none",
            !showProps && "translate-x-full lg:hidden"
          )}>
            <div className="h-full flex flex-col p-4 overflow-hidden bg-white">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Propriedades</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowProps(false)} className="h-8 w-8 p-0"><X size={16} /></Button>
               </div>
               <div className="flex-1 overflow-y-auto scrollbar-hide">
                 <FieldProperties templateId={templateId} />
               </div>
            </div>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {(showNav || showProps) && (
          <div 
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-30 lg:hidden transition-all duration-500" 
            onClick={() => { setShowNav(false); setShowProps(false); }}
          />
        )}
      </div>

      {/* Global Bottom Status Bar */}
      <div className="h-8 bg-white border-t border-slate-200 flex items-center justify-between px-4 hidden sm:flex">
         <div className="flex items-center gap-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Sistema Online</span>
            <span>RegCheck Canvas Engine</span>
         </div>
         <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
            Build 2.0.4 ✓
         </div>
      </div>
    </div>
  );
}
