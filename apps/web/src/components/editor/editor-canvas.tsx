'use client';

import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { Stage, Layer, Rect, Text, Group, Transformer, Image } from 'react-konva';
import type Konva from 'konva';
import { useEditorStore } from '@/stores/editor-store';
import { usePdfRenderer } from '@/hooks/use-pdf-renderer';
import { api } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';
import type { FieldType, FieldConfig } from '@regcheck/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Pixel dimensions for the canvas workspace (logical, before zoom) */
const CANVAS_WIDTH = 800;

/** Render PDF at 2x for crisp display at all zoom levels */
const RENDER_SCALE = 2;

/** Zoom step per wheel tick */
const ZOOM_STEP = 0.1;

/** Color mapping for field types */
const FIELD_COLORS: Record<FieldType, string> = {
  text: '#3b82f6',
  image: '#10b981',
  signature: '#f59e0b',
  checkbox: '#8b5cf6',
};

interface EditorCanvasProps {
  pdfFileKey: string;
  templateId: string;
}

export function EditorCanvas({ pdfFileKey, templateId }: EditorCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    fields,
    currentPage,
    zoom,
    selectedFieldIds,
    activeTool,
    snapEnabled,
    gridSize,
    selectField,
    toggleFieldSelection,
    addField,
    updateField,
    updateFieldId,
    removeFields,
    copyFields,
    pasteFields,
    saveSnapshot,
    setZoom,
  } = useEditorStore();

  const [pdfRendered, setPdfRendered] = useState(0);

  const pdfUrl = pdfFileKey ? `${API_URL}/api/uploads/presigned?key=${pdfFileKey}` : null;
  const { pages, renderPage } = usePdfRenderer(pdfUrl);

  const currentPageInfo = pages[currentPage];
  const pageHeight = currentPageInfo
    ? (CANVAS_WIDTH / currentPageInfo.width) * currentPageInfo.height
    : CANVAS_WIDTH * 1.4142;

  // Render PDF page to hidden canvas at high resolution (only on page change, NOT on zoom)
  useEffect(() => {
    if (!currentPageInfo) return;
    if (!pdfCanvasRef.current) {
      pdfCanvasRef.current = document.createElement('canvas');
    }
    const scale = (CANVAS_WIDTH * RENDER_SCALE) / currentPageInfo.width;
    renderPage(currentPage, pdfCanvasRef.current, scale).then(() => {
      setPdfRendered((c) => c + 1);
    });
  }, [currentPage, currentPageInfo, renderPage]);

  // Filter fields for current page
  const pageFields = useMemo(
    () => fields.filter((f) => f.pageIndex === currentPage),
    [fields, currentPage],
  );

  // Create field mutation — syncs client UUID with server-generated ID on success
  const createFieldMutation = useMutation({
    mutationFn: (data: { clientId: string; type: FieldType; pageIndex: number; position: Record<string, number>; config: FieldConfig }) => {
      const { clientId: _, ...payload } = data;
      return api.createField(templateId, payload) as Promise<{ id: string }>;
    },
    onSuccess: (serverField, variables) => {
      if (serverField?.id && serverField.id !== variables.clientId) {
        updateFieldId(variables.clientId, serverField.id);
      }
    },
  });

  // Delete fields mutation
  const deleteFieldsMutation = useMutation({
    mutationFn: async (fieldIds: string[]) => {
      await Promise.all(fieldIds.map((id) => api.deleteField(templateId, id)));
    },
    onSuccess: (_, fieldIds) => {
      removeFields(fieldIds);
    },
  });

  /** Handle mouse wheel zoom (zoom toward cursor position) */
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const oldZoom = zoom;
      const direction = e.evt.deltaY < 0 ? 1 : -1;
      const newZoom = Math.max(0.25, Math.min(3, oldZoom + direction * ZOOM_STEP));

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldZoom,
        y: (pointer.y - stage.y()) / oldZoom,
      };

      const newPos = {
        x: pointer.x - mousePointTo.x * newZoom,
        y: pointer.y - mousePointTo.y * newZoom,
      };

      stage.position(newPos);
      setZoom(newZoom);
    },
    [zoom, setZoom],
  );

  /** Handle clicking on the stage to create a new field */
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target === e.target.getStage()) {
        selectField(null);

        if (activeTool) {
          const stage = stageRef.current;
          if (!stage) return;

          const pos = stage.getPointerPosition();
          if (!pos) return;

          const relX = (pos.x - stage.x()) / zoom / CANVAS_WIDTH;
          const relY = (pos.y - stage.y()) / zoom / pageHeight;
          const fieldId = crypto.randomUUID();

          const defaultConfigs: Record<FieldType, FieldConfig> = {
            text: { label: 'Texto', required: false, fontSize: 12 },
            image: { label: 'Imagem', required: false },
            signature: { label: 'Assinatura', required: false },
            checkbox: { label: 'Checkbox', required: false },
          };

          const defaultSizes: Record<FieldType, { width: number; height: number }> = {
            text: { width: 0.2, height: 0.03 },
            image: { width: 0.15, height: 0.12 },
            signature: { width: 0.2, height: 0.06 },
            checkbox: { width: 0.025, height: 0.02 },
          };

          const size = defaultSizes[activeTool];
          const config = defaultConfigs[activeTool];

          addField({
            id: fieldId,
            type: activeTool,
            pageIndex: currentPage,
            position: { x: relX, y: relY, width: size.width, height: size.height },
            config,
          });

          // Persist to API — includes clientId so onSuccess can sync the ID
          createFieldMutation.mutate({
            clientId: fieldId,
            type: activeTool,
            pageIndex: currentPage,
            position: { x: relX, y: relY, width: size.width, height: size.height },
            config,
          });
        }
      }
    },
    [activeTool, currentPage, zoom, pageHeight, selectField, addField, createFieldMutation],
  );

  /** Handle field click — supports Shift+Click for multi-select */
  const handleFieldClick = useCallback(
    (fieldId: string, e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      if (e.evt.shiftKey) {
        toggleFieldSelection(fieldId);
      } else {
        selectField(fieldId);
      }
    },
    [selectField, toggleFieldSelection],
  );

  /** Handle field drag end */
  const handleDragEnd = useCallback(
    (fieldId: string, e: Konva.KonvaEventObject<DragEvent>) => {
      let newX = e.target.x() / CANVAS_WIDTH;
      let newY = e.target.y() / pageHeight;

      if (snapEnabled) {
        const snap = (v: number) => Math.round(v * 1000 / gridSize) * gridSize / 1000;
        newX = snap(newX);
        newY = snap(newY);
      }

      updateField(fieldId, {
        position: { ...fields.find((f) => f.id === fieldId)!.position, x: newX, y: newY },
      });
      saveSnapshot();
    },
    [pageHeight, snapEnabled, gridSize, updateField, fields, saveSnapshot],
  );

  /** Handle field resize */
  const handleTransformEnd = useCallback(
    (fieldId: string, e: Konva.KonvaEventObject<Event>) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      node.scaleX(1);
      node.scaleY(1);

      const newWidth = (node.width() * scaleX) / CANVAS_WIDTH;
      const newHeight = (node.height() * scaleY) / pageHeight;
      const newX = node.x() / CANVAS_WIDTH;
      const newY = node.y() / pageHeight;

      updateField(fieldId, {
        position: { x: newX, y: newY, width: newWidth, height: newHeight },
      });
      saveSnapshot();
    },
    [pageHeight, updateField, saveSnapshot],
  );

  // Keyboard shortcuts: Delete, Ctrl+C, Ctrl+V
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const { selectedFieldIds: ids } = useEditorStore.getState();

      // Delete / Backspace — delete selected fields
      if ((e.key === 'Delete' || e.key === 'Backspace') && ids.length > 0) {
        e.preventDefault();
        deleteFieldsMutation.mutate(ids);
      }

      // Ctrl+C / Cmd+C — copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && ids.length > 0) {
        e.preventDefault();
        copyFields();
      }

      // Ctrl+V / Cmd+V — paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        const { clipboard } = useEditorStore.getState();
        if (clipboard.length === 0) return;
        e.preventDefault();
        const newFields = pasteFields();
        // Persist each pasted field to API
        for (const f of newFields) {
          createFieldMutation.mutate({
            clientId: f.id,
            type: f.type,
            pageIndex: f.pageIndex,
            position: f.position as unknown as Record<string, number>,
            config: f.config,
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copyFields, pasteFields, createFieldMutation, deleteFieldsMutation]);

  // Update transformer when selection changes (supports multi-select)
  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const stage = stageRef.current;
    if (!stage) return;

    if (selectedFieldIds.length > 0) {
      const nodes = selectedFieldIds
        .map((id) => stage.findOne(`#field-${id}`))
        .filter(Boolean) as Konva.Node[];
      transformer.nodes(nodes);
    } else {
      transformer.nodes([]);
    }
    transformer.getLayer()?.batchDraw();
  }, [selectedFieldIds]);

  // Prevent default wheel scrolling on the container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const prevent = (e: WheelEvent) => e.preventDefault();
    container.addEventListener('wheel', prevent, { passive: false });
    return () => container.removeEventListener('wheel', prevent);
  }, []);

  const stageWidth = CANVAS_WIDTH * zoom;
  const stageHeight = pageHeight * zoom;
  const selectedSet = useMemo(() => new Set(selectedFieldIds), [selectedFieldIds]);

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center p-4 overflow-auto flex-1"
      style={{ cursor: activeTool ? 'crosshair' : 'grab' }}
      tabIndex={0}
    >
      <Stage
        ref={stageRef}
        width={stageWidth}
        height={stageHeight}
        scaleX={zoom}
        scaleY={zoom}
        draggable={!activeTool}
        onClick={handleStageClick}
        onWheel={handleWheel}
        style={{ border: '1px solid #e5e7eb', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
      >
        {/* PDF background layer */}
        <Layer listening={false}>
          <Rect width={CANVAS_WIDTH} height={pageHeight} fill="white" />
          {pdfRendered > 0 && pdfCanvasRef.current && (
            <Image image={pdfCanvasRef.current} width={CANVAS_WIDTH} height={pageHeight} />
          )}
        </Layer>

        {/* Fields layer */}
        <Layer>
          {pageFields.map((field) => {
            const x = field.position.x * CANVAS_WIDTH;
            const y = field.position.y * pageHeight;
            const width = field.position.width * CANVAS_WIDTH;
            const height = field.position.height * pageHeight;
            const color = FIELD_COLORS[field.type];
            const isSelected = selectedSet.has(field.id);

            return (
              <Group
                key={field.id}
                id={`field-${field.id}`}
                x={x}
                y={y}
                width={width}
                height={height}
                draggable
                onClick={(e) => handleFieldClick(field.id, e)}
                onDragEnd={(e) => handleDragEnd(field.id, e)}
                onTransformEnd={(e) => handleTransformEnd(field.id, e)}
              >
                <Rect
                  width={width}
                  height={height}
                  fill={`${color}15`}
                  stroke={isSelected ? color : `${color}80`}
                  strokeWidth={isSelected ? 2 / zoom : 1 / zoom}
                  cornerRadius={2}
                />
                <Text
                  text={field.config.label}
                  width={width}
                  height={height}
                  fontSize={10 / zoom}
                  fill={color}
                  align="center"
                  verticalAlign="middle"
                  listening={false}
                />
              </Group>
            );
          })}

          <Transformer ref={transformerRef} boundBoxFunc={(_, newBox) => newBox} />
        </Layer>

        {/* Grid overlay */}
        {snapEnabled && (
          <Layer listening={false} opacity={0.1}>
            {Array.from({ length: Math.ceil(CANVAS_WIDTH / gridSize) }, (_, i) => (
              <Rect
                key={`gv-${i}`}
                x={i * gridSize}
                y={0}
                width={1 / zoom}
                height={pageHeight}
                fill="#000"
              />
            ))}
            {Array.from({ length: Math.ceil(pageHeight / gridSize) }, (_, i) => (
              <Rect
                key={`gh-${i}`}
                x={0}
                y={i * gridSize}
                width={CANVAS_WIDTH}
                height={1 / zoom}
                fill="#000"
              />
            ))}
          </Layer>
        )}
      </Stage>
    </div>
  );
}
