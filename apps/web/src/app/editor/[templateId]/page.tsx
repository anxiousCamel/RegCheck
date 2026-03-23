'use client';

import { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button, Spinner } from '@regcheck/ui';
import { api } from '@/lib/api';
import { useEditorStore } from '@/stores/editor-store';
import { EditorCanvas } from '@/components/editor/editor-canvas';
import { EditorToolbar } from '@/components/editor/editor-toolbar';
import { FieldProperties } from '@/components/editor/field-properties';
import { PageNavigator } from '@/components/editor/page-navigator';
import { RepetitionConfig } from '@/components/editor/repetition-config';
import { useAutosave } from '@/hooks/use-autosave';
import type { FieldType, FieldPosition, FieldConfig } from '@regcheck/shared';

export default function EditorPage() {
  const params = useParams<{ templateId: string }>();
  const templateId = params.templateId;

  const { fields, isDirty, setFields, markClean } = useEditorStore();
  const initializedRef = useRef(false);

  const { data: template, isLoading } = useQuery({
    queryKey: ['template', templateId],
    queryFn: () => api.getTemplate(templateId),
    enabled: !!templateId,
  });

  // Initialize editor fields from template — only once on first load
  useEffect(() => {
    if (!template || initializedRef.current) return;
    const t = template as {
      fields: Array<{
        id: string;
        type: string;
        pageIndex: number;
        position: FieldPosition;
        config: FieldConfig;
        repetitionGroupId?: string;
      }>;
      pdfFile: { pageCount: number };
    };

    if (!Array.isArray(t.fields)) {
      console.error('[EditorPage] Expected fields array, got:', typeof t.fields);
      return;
    }

    const editorFields = t.fields.map((f) => ({
      id: f.id,
      type: f.type.toLowerCase() as FieldType,
      pageIndex: f.pageIndex,
      position: f.position,
      config: f.config,
      repetitionGroupId: f.repetitionGroupId,
    }));

    console.debug('[EditorPage] Initializing', editorFields.length, 'fields from template');
    setFields(editorFields);
    useEditorStore.getState().setTotalPages(t.pdfFile.pageCount);
    initializedRef.current = true;
  }, [template, setFields]);

  // Autosave fields to API (positions + config)
  const saveMutation = useMutation({
    mutationFn: async () => {
      const currentFields = useEditorStore.getState().fields;
      const updates = currentFields.map((f) => ({
        id: f.id,
        position: f.position,
        config: f.config as Record<string, unknown>,
      }));
      await api.batchUpdatePositions(templateId, updates);
    },
    onSuccess: () => markClean(),
  });

  useAutosave(fields, isDirty, async () => {
    await saveMutation.mutateAsync();
  });

  const publishMutation = useMutation({
    mutationFn: () => api.publishTemplate(templateId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    );
  }

  const templateData = template as { name: string; status: string; pdfFile: { fileKey: string } } | undefined;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold">{templateData?.name}</h1>
          {isDirty && <span className="text-xs text-amber-600">Alteracoes nao salvas</span>}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={!isDirty || saveMutation.isPending}
          >
            Salvar
          </Button>
          <Button
            size="sm"
            onClick={() => publishMutation.mutate()}
            disabled={templateData?.status === 'PUBLISHED' || publishMutation.isPending}
          >
            Publicar
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <EditorToolbar templateId={templateId} />

      {/* Main editor area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Page navigator */}
        <PageNavigator />

        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-neutral-100">
          <EditorCanvas
            pdfFileKey={templateData?.pdfFile.fileKey ?? ''}
            templateId={templateId}
            isPublished={templateData?.status === 'PUBLISHED'}
          />
        </div>

        {/* Properties panel */}
        <div className="w-72 border-l overflow-y-auto">
          <FieldProperties templateId={templateId} />
          <RepetitionConfig templateId={templateId} />
        </div>
      </div>
    </div>
  );
}
