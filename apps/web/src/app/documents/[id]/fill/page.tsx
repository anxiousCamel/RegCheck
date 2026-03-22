'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button, Spinner, Badge } from '@regcheck/ui';
import { RepetitionEngine, FieldCloner } from '@regcheck/editor-engine';
import { api } from '@/lib/api';
import { SignatureCanvas } from '@/components/document/signature-canvas';
import { useAutosave } from '@/hooks/use-autosave';
import type { FieldType, FieldPosition, FieldConfig, RepetitionConfig } from '@regcheck/shared';

interface TemplateField {
  id: string;
  type: string;
  pageIndex: number;
  position: FieldPosition;
  config: FieldConfig;
  repetitionGroupId?: string;
  repetitionIndex?: number;
  createdAt: string;
  updatedAt: string;
}

interface FieldValue {
  fieldId: string;
  itemIndex: number;
  value: string | boolean;
  fileKey?: string;
}

export default function FillDocumentPage() {
  const params = useParams<{ id: string }>();
  const documentId = params.id;

  const [fieldValues, setFieldValues] = useState<Map<string, FieldValue>>(new Map());
  const [currentItem, setCurrentItem] = useState(0);
  const [isDirty, setIsDirty] = useState(false);

  const { data: doc, isLoading } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => api.getDocument(documentId),
  });

  const docData = doc as {
    totalItems: number;
    status: string;
    template: {
      fields: TemplateField[];
      repetitionConfig?: RepetitionConfig;
      pdfFile: { pageCount: number };
    };
    filledFields: Array<{ fieldId: string; itemIndex: number; value: string; fileKey?: string }>;
  } | undefined;

  // Initialize values from loaded data
  useEffect(() => {
    if (!docData?.filledFields) return;
    const map = new Map<string, FieldValue>();
    for (const f of docData.filledFields) {
      const key = `${f.fieldId}_${f.itemIndex}`;
      map.set(key, {
        fieldId: f.fieldId,
        itemIndex: f.itemIndex,
        value: f.value,
        fileKey: f.fileKey,
      });
    }
    setFieldValues(map);
  }, [docData?.filledFields]);

  // Compute fields for the current item
  const fieldsForItem = useMemo(() => {
    if (!docData) return [];
    return docData.template.fields.map((f) => ({
      ...f,
      type: f.type.toLowerCase() as FieldType,
    }));
  }, [docData]);

  const totalItems = docData?.totalItems ?? 1;
  const items = Array.from({ length: totalItems }, (_, i) => i);

  const updateValue = useCallback(
    (fieldId: string, itemIndex: number, value: string | boolean, fileKey?: string) => {
      setFieldValues((prev) => {
        const next = new Map(prev);
        next.set(`${fieldId}_${itemIndex}`, { fieldId, itemIndex, value, fileKey });
        return next;
      });
      setIsDirty(true);
    },
    [],
  );

  const getFieldValue = useCallback(
    (fieldId: string, itemIndex: number): string | boolean => {
      return fieldValues.get(`${fieldId}_${itemIndex}`)?.value ?? '';
    },
    [fieldValues],
  );

  // Autosave
  const saveMutation = useMutation({
    mutationFn: async () => {
      const fields = Array.from(fieldValues.values()).map((v) => ({
        fieldId: v.fieldId,
        itemIndex: v.itemIndex,
        value: v.value,
        fileKey: v.fileKey,
      }));
      if (fields.length > 0) {
        await api.saveFilledData(documentId, fields);
      }
    },
    onSuccess: () => setIsDirty(false),
  });

  useAutosave(fieldValues, isDirty, async () => {
    await saveMutation.mutateAsync();
  });

  // Generate PDF
  const generateMutation = useMutation({
    mutationFn: () => api.generatePdf(documentId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Preencher Documento</h1>
          <p className="text-muted-foreground">{totalItems} itens para preencher</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => saveMutation.mutate()}
            disabled={!isDirty || saveMutation.isPending}
          >
            {saveMutation.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Salvar
          </Button>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            Gerar PDF
          </Button>
        </div>
      </div>

      {generateMutation.isSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          PDF em geracao! Acompanhe o status na lista de documentos.
        </div>
      )}

      {/* Item navigation */}
      <div className="flex gap-2 flex-wrap">
        {items.map((i) => (
          <Button
            key={i}
            variant={currentItem === i ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentItem(i)}
          >
            Item {i + 1}
          </Button>
        ))}
      </div>

      {/* Fields for current item */}
      <div className="space-y-4 max-w-2xl">
        {fieldsForItem.map((field) => (
          <div key={field.id} className="space-y-2 border rounded-lg p-4">
            <div className="flex items-center gap-2">
              <label className="font-medium text-sm">{field.config.label}</label>
              {field.config.required && <Badge variant="destructive">Obrigatorio</Badge>}
              <Badge variant="secondary">{field.type}</Badge>
            </div>

            {field.type === 'text' && (
              <input
                type="text"
                value={String(getFieldValue(field.id, currentItem) || '')}
                onChange={(e) => updateValue(field.id, currentItem, e.target.value)}
                placeholder={field.config.placeholder ?? ''}
                className="w-full h-10 rounded-md border border-input px-3 text-sm"
                maxLength={field.config.maxLength}
              />
            )}

            {field.type === 'checkbox' && (
              <input
                type="checkbox"
                checked={getFieldValue(field.id, currentItem) === 'true'}
                onChange={(e) => updateValue(field.id, currentItem, String(e.target.checked))}
                className="h-5 w-5 rounded"
              />
            )}

            {field.type === 'image' && (
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const result = await api.uploadImage(file, 'image');
                    updateValue(field.id, currentItem, file.name, result.fileKey);
                  }}
                  className="text-sm"
                />
                {fieldValues.get(`${field.id}_${currentItem}`)?.fileKey && (
                  <p className="text-xs text-muted-foreground">Imagem enviada</p>
                )}
              </div>
            )}

            {field.type === 'signature' && (
              <SignatureCanvas
                value={String(getFieldValue(field.id, currentItem) || '')}
                onChange={(dataUrl) => updateValue(field.id, currentItem, dataUrl)}
              />
            )}
          </div>
        ))}

        {fieldsForItem.length === 0 && (
          <p className="text-muted-foreground">
            Nenhum campo definido neste template.
          </p>
        )}
      </div>
    </div>
  );
}
