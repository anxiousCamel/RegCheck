'use client';

import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { Stage, Layer, Rect, Text, Group, Transformer, Image } from 'react-konva';
import type Konva from 'konva';
import { Spinner } from '@regcheck/ui';
import { useEditorStore } from '@/stores/editor-store';
import { usePdfRenderer } from '@/hooks/use-pdf-renderer';
import { api } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { FieldType, FieldConfig, FieldScope } from '@regcheck/shared';

/** Interaction state for canvas mouse operations */
type CanvasInteraction =
  | { type: 'rubberband'; startX: number; startY: number; endX: number; endY: number }
  | { type: 'creation'; startX: number; startY: number; endX: number; endY: number }
  | {
      type: 'pan';
      startMouseX: number;
      startMouseY: number;
      startStageX: number;
      startStageY: number;
    }
  | null;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Pixel dimensions for the canvas workspace (logical, before zoom) */
const CANVAS_WIDTH = 800;

/** Zoom step per wheel tick */
const ZOOM_STEP = 0.1;

/** Min/max zoom levels */
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 10;

/** Color mapping for field types */
const FIELD_COLORS: Record<FieldType, string> = {
  text: '#3b82f6',
  image: '#10b981',
  signature: '#f59e0b',
  checkbox: '#8b5cf6',
};

/** Slot badge colors by group index */
const SLOT_COLORS = [
  '#2563eb',
  '#16a34a',
  '#ea580c',
  '#9333ea',
  '#dc2626',
  '#0891b2',
  '#ca8a04',
  '#be185d',
];
const getSlotColor = (group: number) => SLOT_COLORS[group % SLOT_COLORS.length] ?? '#2563eb';

interface EditorCanvasProps {
  pdfFileKey: string;
  templateId: string;
  isPublished?: boolean;
}

export function EditorCanvas({ pdfFileKey, templateId, isPublished }: EditorCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();

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
    undo,
    redo,
    replicationPreview,
    selectFields,
  } = useEditorStore();

  const [interaction, setInteraction] = useState<CanvasInteraction>(null);
  const [pdfRendered, setPdfRendered] = useState(0);
  const pdfRenderZoomRef = useRef(0);

  const pdfUrl = pdfFileKey ? `${API_URL}/api/uploads/file?key=${pdfFileKey}` : null;
  const { pages, loading: pdfLoading, error: pdfError, renderPage } = usePdfRenderer(pdfUrl);

  const currentPageInfo = pages[currentPage];
  const pageHeight = currentPageInfo
    ? (CANVAS_WIDTH / currentPageInfo.width) * currentPageInfo.height
    : CANVAS_WIDTH * 1.4142;

  // Re-render PDF when zoom changes significantly or page changes (for crisp display)
  useEffect(() => {
    if (!currentPageInfo) return;
    // Render at the higher of 2x or current zoom for crisp display
    const renderScale = Math.max(2, zoom);
    // Only re-render if zoom changed enough to matter (avoid unnecessary work)
    if (pdfRenderZoomRef.current > 0 && Math.abs(renderScale - pdfRenderZoomRef.current) < 0.3)
      return;
    pdfRenderZoomRef.current = renderScale;

    if (!pdfCanvasRef.current) {
      pdfCanvasRef.current = document.createElement('canvas');
    }
    const scale = (CANVAS_WIDTH * renderScale) / currentPageInfo.width;
    renderPage(currentPage, pdfCanvasRef.current, scale).then(() => {
      setPdfRendered((c) => c + 1);
    });
  }, [currentPage, currentPageInfo, renderPage, zoom]);

  // Filter fields for current page
  const pageFields = useMemo(
    () => fields.filter((f) => f.pageIndex === currentPage),
    [fields, currentPage],
  );

  // Ghost fields for replication preview (current page only)
  const pageGhosts = useMemo(
    () => replicationPreview?.ghosts.filter((g) => g.pageIndex === currentPage) ?? [],
    [replicationPreview, currentPage],
  );

  // Create field mutation — syncs client UUID with server-generated ID on success
  const createFieldMutation = useMutation({
    mutationFn: (data: {
      clientId: string;
      type: FieldType;
      pageIndex: number;
      position: Record<string, number>;
      config: FieldConfig;
      scope: FieldScope;
      slotIndex: number | null;
      bindingKey: string | null;
    }) => {
      const { clientId: _, ...payload } = data;
      return api.createField(templateId, payload) as Promise<{ id: string }>;
    },
    onSuccess: (serverField, variables) => {
      if (serverField?.id && serverField.id !== variables.clientId) {
        updateFieldId(variables.clientId, serverField.id);
      }
    },
  });

  // Delete fields mutation — removes from state immediately (optimistic)
  const deleteFieldsMutation = useMutation({
    mutationFn: async (fieldIds: string[]) => {
      // Optimistically remove from state before API call
      removeFields(fieldIds);
      // Delete from backend
      const results = await Promise.allSettled(
        fieldIds.map((id) => api.deleteField(templateId, id)),
      );
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        console.error('[deleteFields] Some deletions failed:', failures);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template', templateId] });
    },
  });

  /** Convert pointer position to logical canvas coordinates */
  const getLogicalPos = useCallback(
    (stage: Konva.Stage) => {
      const pos = stage.getPointerPosition();
      if (!pos) return null;
      return {
        x: (pos.x - stage.x()) / zoom,
        y: (pos.y - stage.y()) / zoom,
      };
    },
    [zoom],
  );

  /** Default field configs */
  const defaultConfigs: Record<FieldType, FieldConfig> = useMemo(
    () => ({
      text: { label: 'Texto', required: false, fontSize: 12 },
      image: { label: 'Imagem', required: false },
      signature: { label: 'Assinatura', required: false },
      checkbox: { label: 'Checkbox', required: false },
    }),
    [],
  );

  const defaultSizes: Record<FieldType, { width: number; height: number }> = useMemo(
    () => ({
      text: { width: 0.2, height: 0.03 },
      image: { width: 0.15, height: 0.12 },
      signature: { width: 0.2, height: 0.06 },
      checkbox: { width: 0.025, height: 0.02 },
    }),
    [],
  );

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
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom + direction * ZOOM_STEP));

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

  /** Handle mousedown on the stage — starts pan, rubber band, or creation drag */
  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = stageRef.current;
      if (!stage) return;

      // Right click → pan
      if (e.evt.button === 2) {
        e.evt.preventDefault();
        const pos = stage.getPointerPosition();
        if (!pos) return;
        setInteraction({
          type: 'pan',
          startMouseX: pos.x,
          startMouseY: pos.y,
          startStageX: stage.x(),
          startStageY: stage.y(),
        });
        return;
      }

      // Left click on empty stage area only
      if (e.target !== e.target.getStage()) return;

      const logicalPos = getLogicalPos(stage);
      if (!logicalPos) return;

      if (activeTool && !isPublished) {
        // Start click-and-drag field creation
        setInteraction({
          type: 'creation',
          startX: logicalPos.x,
          startY: logicalPos.y,
          endX: logicalPos.x,
          endY: logicalPos.y,
        });
      } else if (!activeTool) {
        // Start rubber band selection
        if (!e.evt.shiftKey) selectField(null);
        setInteraction({
          type: 'rubberband',
          startX: logicalPos.x,
          startY: logicalPos.y,
          endX: logicalPos.x,
          endY: logicalPos.y,
        });
      }
    },
    [activeTool, isPublished, getLogicalPos, selectField],
  );

  /** Handle mousemove on the stage — updates pan, rubber band, or creation rect */
  const handleStageMouseMove = useCallback(
    (_e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!interaction) return;
      const stage = stageRef.current;
      if (!stage) return;

      if (interaction.type === 'pan') {
        const pos = stage.getPointerPosition();
        if (!pos) return;
        stage.position({
          x: interaction.startStageX + (pos.x - interaction.startMouseX),
          y: interaction.startStageY + (pos.y - interaction.startMouseY),
        });
        stage.batchDraw();
        return;
      }

      const logicalPos = getLogicalPos(stage);
      if (!logicalPos) return;

      setInteraction((prev) => {
        if (!prev || prev.type === 'pan') return prev;
        return { ...prev, endX: logicalPos.x, endY: logicalPos.y };
      });
    },
    [interaction, getLogicalPos],
  );

  /** Handle mouseup on the stage — finalizes pan, rubber band selection, or field creation */
  const handleStageMouseUp = useCallback(
    (_e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!interaction) return;

      if (interaction.type === 'pan') {
        setInteraction(null);
        return;
      }

      if (interaction.type === 'rubberband') {
        const minX = Math.min(interaction.startX, interaction.endX) / CANVAS_WIDTH;
        const maxX = Math.max(interaction.startX, interaction.endX) / CANVAS_WIDTH;
        const minY = Math.min(interaction.startY, interaction.endY) / pageHeight;
        const maxY = Math.max(interaction.startY, interaction.endY) / pageHeight;

        const dragDist =
          Math.abs(interaction.endX - interaction.startX) +
          Math.abs(interaction.endY - interaction.startY);

        if (dragDist > 3) {
          const idsInRect = pageFields
            .filter((f) => {
              return (
                f.position.x + f.position.width > minX &&
                f.position.x < maxX &&
                f.position.y + f.position.height > minY &&
                f.position.y < maxY
              );
            })
            .map((f) => f.id);

          if (idsInRect.length > 0) {
            selectFields(idsInRect);
          }
        }
        setInteraction(null);
        return;
      }

      if (interaction.type === 'creation' && activeTool) {
        const minX = Math.min(interaction.startX, interaction.endX);
        const maxX = Math.max(interaction.startX, interaction.endX);
        const minY = Math.min(interaction.startY, interaction.endY);
        const maxY = Math.max(interaction.startY, interaction.endY);

        let relX = minX / CANVAS_WIDTH;
        let relY = minY / pageHeight;
        let width = (maxX - minX) / CANVAS_WIDTH;
        let height = (maxY - minY) / pageHeight;

        const dragDist =
          Math.abs(interaction.endX - interaction.startX) +
          Math.abs(interaction.endY - interaction.startY);

        // If barely dragged, use default sizes (click to create)
        if (dragDist < 5) {
          const size = defaultSizes[activeTool];
          width = size.width;
          height = size.height;
          // Use start position for click-to-create
          relX = interaction.startX / CANVAS_WIDTH;
          relY = interaction.startY / pageHeight;
        }

        // Enforce minimum dimensions to prevent invisible/broken fields
        const minSize = defaultSizes[activeTool];
        width = Math.max(width, minSize.width * 0.5);
        height = Math.max(height, minSize.height * 0.5);

        const fieldId = crypto.randomUUID();
        const config = defaultConfigs[activeTool];

        addField({
          id: fieldId,
          type: activeTool,
          pageIndex: currentPage,
          position: { x: relX, y: relY, width, height },
          config,
          scope: 'item',
          slotIndex: 0,
          bindingKey: null,
        });

        createFieldMutation.mutate({
          clientId: fieldId,
          type: activeTool,
          pageIndex: currentPage,
          position: { x: relX, y: relY, width, height },
          config,
          scope: 'item',
          slotIndex: 0,
          bindingKey: null,
        });

        setInteraction(null);
        return;
      }

      setInteraction(null);
    },
    [
      interaction,
      activeTool,
      currentPage,
      pageHeight,
      pageFields,
      selectFields,
      addField,
      createFieldMutation,
      defaultConfigs,
      defaultSizes,
    ],
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
        // Snap to adaptive grid: finer snap at higher zoom levels
        const subdivisions = Math.max(1, Math.pow(2, Math.floor(Math.log2(zoom))));
        const snapStep = gridSize / 1000 / subdivisions;
        const snap = (v: number) => Math.round(v / snapStep) * snapStep;
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

      const newWidth = Math.max((node.width() * scaleX) / CANVAS_WIDTH, 0.005);
      const newHeight = Math.max((node.height() * scaleY) / pageHeight, 0.005);
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

        // Block autosave while creating pasted fields
        useEditorStore.getState().setBatchOperation(true);
        const newFields = pasteFields();
        // Persist all pasted fields and wait for completion before unblocking
        Promise.all(
          newFields.map((f) =>
            createFieldMutation.mutateAsync({
              clientId: f.id,
              type: f.type,
              pageIndex: f.pageIndex,
              position: f.position as unknown as Record<string, number>,
              config: f.config,
              scope: f.scope,
              slotIndex: f.slotIndex,
              bindingKey: f.bindingKey,
            }),
          ),
        )
          .catch((err) => console.error('[Paste] Some fields failed to persist:', err))
          .finally(() => useEditorStore.getState().setBatchOperation(false));
      }

      // Ctrl+Z / Cmd+Z — undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl+Y / Cmd+Y or Ctrl+Shift+Z / Cmd+Shift+Z — redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copyFields, pasteFields, createFieldMutation, deleteFieldsMutation, undo, redo]);

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

  // Cancel interaction if mouse released outside the canvas
  useEffect(() => {
    if (!interaction) return;
    const handleWindowMouseUp = () => setInteraction(null);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => window.removeEventListener('mouseup', handleWindowMouseUp);
  }, [interaction]);

  // Prevent default wheel scrolling on the container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const prevent = (e: WheelEvent) => e.preventDefault();
    const preventCtx = (e: MouseEvent) => e.preventDefault();
    container.addEventListener('wheel', prevent, { passive: false });
    container.addEventListener('contextmenu', preventCtx);
    return () => {
      container.removeEventListener('wheel', prevent);
      container.removeEventListener('contextmenu', preventCtx);
    };
  }, []);

  const stageWidth = CANVAS_WIDTH * zoom;
  const stageHeight = pageHeight * zoom;
  const selectedSet = useMemo(() => new Set(selectedFieldIds), [selectedFieldIds]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center p-4 overflow-auto flex-1"
      style={{
        cursor: interaction?.type === 'pan' ? 'grabbing' : activeTool ? 'crosshair' : 'default',
      }}
      tabIndex={0}
    >
      {pdfLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/80">
          <div className="flex flex-col items-center gap-2">
            <Spinner className="h-8 w-8" />
            <span className="text-sm text-muted-foreground">Carregando PDF...</span>
          </div>
        </div>
      )}
      {pdfError && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/90">
          <div className="flex flex-col items-center gap-3 text-center max-w-sm">
            <p className="text-sm font-medium text-red-600">Erro ao carregar PDF</p>
            <p className="text-xs text-muted-foreground">{pdfError}</p>
          </div>
        </div>
      )}
      <Stage
        ref={stageRef}
        width={stageWidth}
        height={stageHeight}
        scaleX={zoom}
        scaleY={zoom}
        draggable={false}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.evt.preventDefault()}
        style={{
          border: '1px solid #e5e7eb',
          background: 'white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
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
                {field.scope === 'global' && (
                  <>
                    <Rect
                      x={width - 22 / zoom}
                      y={0}
                      width={22 / zoom}
                      height={12 / zoom}
                      fill="#6366f1"
                      cornerRadius={2}
                      listening={false}
                    />
                    <Text
                      x={width - 22 / zoom}
                      y={0}
                      width={22 / zoom}
                      height={12 / zoom}
                      text="GLB"
                      fontSize={8 / zoom}
                      fill="white"
                      align="center"
                      verticalAlign="middle"
                      listening={false}
                    />
                  </>
                )}
                {field.scope === 'item' && field.slotIndex != null && (
                  <>
                    <Rect
                      x={width - 18 / zoom}
                      y={0}
                      width={18 / zoom}
                      height={12 / zoom}
                      fill={getSlotColor(field.slotIndex)}
                      cornerRadius={2}
                      listening={false}
                    />
                    <Text
                      x={width - 18 / zoom}
                      y={0}
                      width={18 / zoom}
                      height={12 / zoom}
                      text={`S${field.slotIndex}`}
                      fontSize={8 / zoom}
                      fill="white"
                      align="center"
                      verticalAlign="middle"
                      listening={false}
                    />
                  </>
                )}
              </Group>
            );
          })}

          <Transformer ref={transformerRef} boundBoxFunc={(_, newBox) => newBox} />
        </Layer>

        {/* Ghost fields layer — replication preview */}
        {pageGhosts.length > 0 && (
          <Layer listening={false}>
            {pageGhosts.map((ghost) => {
              const x = ghost.position.x * CANVAS_WIDTH;
              const y = ghost.position.y * pageHeight;
              const width = ghost.position.width * CANVAS_WIDTH;
              const height = ghost.position.height * pageHeight;
              const color = FIELD_COLORS[ghost.type];
              const isOutOfBounds =
                ghost.position.x + ghost.position.width > 1.01 ||
                ghost.position.y + ghost.position.height > 1.01;

              return (
                <Group key={ghost.id} x={x} y={y}>
                  {/* Dashed border ghost rectangle */}
                  <Rect
                    width={width}
                    height={height}
                    fill={isOutOfBounds ? '#ef444415' : `${color}10`}
                    stroke={isOutOfBounds ? '#ef4444' : color}
                    strokeWidth={1.5 / zoom}
                    cornerRadius={2}
                    dash={[4 / zoom, 3 / zoom]}
                    opacity={0.7}
                  />
                  <Text
                    text={ghost.config.label}
                    width={width}
                    height={height}
                    fontSize={10 / zoom}
                    fill={color}
                    align="center"
                    verticalAlign="middle"
                    opacity={0.5}
                  />
                </Group>
              );
            })}
          </Layer>
        )}

        {/* Rubber band selection / creation preview overlay */}
        {interaction && interaction.type !== 'pan' && (
          <Layer listening={false}>
            <Rect
              x={Math.min(interaction.startX, interaction.endX)}
              y={Math.min(interaction.startY, interaction.endY)}
              width={Math.abs(interaction.endX - interaction.startX)}
              height={Math.abs(interaction.endY - interaction.startY)}
              fill={
                interaction.type === 'rubberband'
                  ? 'rgba(59, 130, 246, 0.1)'
                  : `${FIELD_COLORS[activeTool!]}20`
              }
              stroke={interaction.type === 'rubberband' ? '#3b82f6' : FIELD_COLORS[activeTool!]}
              strokeWidth={1 / zoom}
              {...(interaction.type === 'creation' ? { dash: [4 / zoom, 3 / zoom] } : {})}
            />
          </Layer>
        )}

        {/* Adaptive grid overlay — subdivides as you zoom in */}
        {snapEnabled &&
          (() => {
            // Base grid step in pixels (at zoom 1)
            const baseStepX = (gridSize / 1000) * CANVAS_WIDTH;
            const baseStepY = (gridSize / 1000) * pageHeight;

            // Compute subdivision level based on zoom:
            // At zoom 1 → 1x, zoom 2 → 2x, zoom 4 → 4x, etc.
            // Use powers of 2 for clean subdivision
            const subdivisions = Math.max(1, Math.pow(2, Math.floor(Math.log2(zoom))));
            const stepX = baseStepX / subdivisions;
            const stepY = baseStepY / subdivisions;

            const vLines = Math.ceil(CANVAS_WIDTH / stepX);
            const hLines = Math.ceil(pageHeight / stepY);

            // Cap line count to prevent performance issues at extreme zoom
            const maxLines = 400;
            if (vLines > maxLines || hLines > maxLines) return null;

            const lines: React.ReactNode[] = [];
            for (let i = 0; i <= vLines; i++) {
              const isMajor = i % subdivisions === 0;
              lines.push(
                <Rect
                  key={`gv-${i}`}
                  x={i * stepX}
                  y={0}
                  width={1 / zoom}
                  height={pageHeight}
                  fill="#000"
                  opacity={isMajor ? 0.15 : 0.06}
                />,
              );
            }
            for (let i = 0; i <= hLines; i++) {
              const isMajor = i % subdivisions === 0;
              lines.push(
                <Rect
                  key={`gh-${i}`}
                  x={0}
                  y={i * stepY}
                  width={CANVAS_WIDTH}
                  height={1 / zoom}
                  fill="#000"
                  opacity={isMajor ? 0.15 : 0.06}
                />,
              );
            }

            return <Layer listening={false}>{lines}</Layer>;
          })()}
      </Stage>
    </div>
  );
}
