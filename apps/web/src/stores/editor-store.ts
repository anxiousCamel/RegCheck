'use client';

import { create } from 'zustand';
import type { FieldType, FieldPosition, FieldConfig, FieldScope } from '@regcheck/shared';
import { HistoryManager } from '@regcheck/editor-engine';

interface EditorField {
  id: string;
  type: FieldType;
  pageIndex: number;
  position: FieldPosition;
  config: FieldConfig;
  /** Field scope: 'global' (one value, rendered on every page) or 'item' (per SX slot). */
  scope: FieldScope;
  /** SX slot index on the page. null for scope='global'. */
  slotIndex: number | null;
  /** Free-form auto-populate binding like `eq.serie` or `global.data`. null for manual fill. */
  bindingKey: string | null;
}

/** Ghost field shown as preview before applying replication */
interface GhostField {
  id: string;
  sourceId: string;
  type: FieldType;
  pageIndex: number;
  position: FieldPosition;
  config: FieldConfig;
  copyIndex: number;
}

interface ReplicationPreview {
  sourceFieldIds: string[];
  copies: number;
  offsetX: number;
  offsetY: number;
  ghosts: GhostField[];
}

interface EditorState {
  fields: EditorField[];
  selectedFieldIds: string[];
  clipboard: EditorField[];
  currentPage: number;
  totalPages: number;
  zoom: number;
  snapEnabled: boolean;
  gridSize: number;
  activeTool: FieldType | null;
  isDirty: boolean;
  history: HistoryManager<EditorField[]>;
  replicationPreview: ReplicationPreview | null;
  isBatchOperation: boolean;

  // Actions
  setFields: (fields: EditorField[]) => void;
  addField: (field: EditorField) => void;
  updateField: (id: string, updates: Partial<EditorField>) => void;
  updateFieldId: (oldId: string, newId: string) => void;
  removeField: (id: string) => void;
  removeFields: (ids: string[]) => void;
  selectField: (id: string | null) => void;
  toggleFieldSelection: (id: string) => void;
  copyFields: () => void;
  pasteFields: () => EditorField[];
  setCurrentPage: (page: number) => void;
  setTotalPages: (total: number) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setSnapEnabled: (enabled: boolean) => void;
  setGridSize: (size: number) => void;
  setActiveTool: (tool: FieldType | null) => void;
  undo: () => void;
  redo: () => void;
  saveSnapshot: () => void;
  markClean: () => void;
  setBatchOperation: (active: boolean) => void;

  setReplicationPreview: (sourceFieldIds: string[], copies: number, offsetX: number, offsetY: number) => void;
  clearReplicationPreview: () => void;
  applyReplication: () => EditorField[];

  selectFields: (ids: string[]) => void;
  updateFields: (ids: string[], updates: Partial<EditorField>) => void;

  /**
   * Atomically update scope + slot index so the invariant
   *   (scope='global' ⇒ slotIndex=null)  ∧  (scope='item' ⇒ slotIndex≠null)
   * always holds in the editor state.
   */
  setFieldScope: (fieldIds: string[], scope: FieldScope, slotIndex?: number) => void;
  setFieldSlot: (fieldIds: string[], slotIndex: number | null) => void;
  setFieldBinding: (fieldIds: string[], bindingKey: string | null) => void;

  readonly selectedFieldId: string | null;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  fields: [],
  selectedFieldIds: [],
  clipboard: [],
  currentPage: 0,
  totalPages: 1,
  zoom: 1,
  snapEnabled: true,
  gridSize: 10,
  activeTool: null,
  isDirty: false,
  history: new HistoryManager<EditorField[]>(50),
  replicationPreview: null,
  isBatchOperation: false,

  get selectedFieldId() {
    return get().selectedFieldIds[0] ?? null;
  },

  setFields: (fields) => {
    set({ fields, isDirty: false, selectedFieldIds: [] });
    get().history.push(fields);
  },

  addField: (field) => {
    const fields = [...get().fields, field];
    set({ fields, isDirty: true, selectedFieldIds: [field.id] });
    get().history.push(fields);
  },

  updateField: (id, updates) => {
    const fields = get().fields.map((f) => (f.id === id ? { ...f, ...updates } : f));
    set({ fields, isDirty: true });
  },

  updateFieldId: (oldId, newId) => {
    const fields = get().fields.map((f) => (f.id === oldId ? { ...f, id: newId } : f));
    const selectedFieldIds = get().selectedFieldIds.map((sid) => (sid === oldId ? newId : sid));
    const clipboard = get().clipboard.map((f) => (f.id === oldId ? { ...f, id: newId } : f));
    set({ fields, selectedFieldIds, clipboard });
  },

  removeField: (id) => {
    const fields = get().fields.filter((f) => f.id !== id);
    const selectedFieldIds = get().selectedFieldIds.filter((sid) => sid !== id);
    set({ fields, selectedFieldIds, isDirty: true });
    get().history.push(fields);
  },

  removeFields: (ids) => {
    const idSet = new Set(ids);
    const fields = get().fields.filter((f) => !idSet.has(f.id));
    const selectedFieldIds = get().selectedFieldIds.filter((sid) => !idSet.has(sid));
    set({ fields, selectedFieldIds, isDirty: true });
    get().history.push(fields);
  },

  selectField: (id) => set({ selectedFieldIds: id ? [id] : [] }),

  toggleFieldSelection: (id) => {
    const current = get().selectedFieldIds;
    if (current.includes(id)) {
      set({ selectedFieldIds: current.filter((sid) => sid !== id) });
    } else {
      set({ selectedFieldIds: [...current, id] });
    }
  },

  copyFields: () => {
    const { fields, selectedFieldIds } = get();
    const selected = fields.filter((f) => selectedFieldIds.includes(f.id));
    set({ clipboard: structuredClone(selected) });
  },

  pasteFields: () => {
    const { clipboard, currentPage } = get();
    if (clipboard.length === 0) return [];

    const OFFSET = 0.02;
    const newFields: EditorField[] = clipboard.map((f) => ({
      id: crypto.randomUUID(),
      type: f.type,
      pageIndex: currentPage,
      position: {
        x: Math.min(f.position.x + OFFSET, 1 - f.position.width),
        y: Math.min(f.position.y + OFFSET, 1 - f.position.height),
        width: f.position.width,
        height: f.position.height,
      },
      config: structuredClone(f.config),
      scope: f.scope,
      slotIndex: f.slotIndex,
      bindingKey: f.bindingKey,
    }));

    const fields = [...get().fields, ...newFields];
    const selectedFieldIds = newFields.map((f) => f.id);
    set({ fields, selectedFieldIds, isDirty: true });
    get().history.push(fields);
    return newFields;
  },

  setCurrentPage: (page) => set({ currentPage: page, selectedFieldIds: [] }),
  setTotalPages: (total) => set({ totalPages: total }),

  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(10, zoom)) }),
  zoomIn: () => set((s) => ({ zoom: Math.min(10, s.zoom + 0.25) })),
  zoomOut: () => set((s) => ({ zoom: Math.max(0.25, s.zoom - 0.25) })),

  setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
  setGridSize: (size) => set({ gridSize: size }),
  selectFields: (ids) => set({ selectedFieldIds: ids }),

  updateFields: (ids, updates) => {
    const idSet = new Set(ids);
    const fields = get().fields.map((f) => (idSet.has(f.id) ? { ...f, ...updates } : f));
    set({ fields, isDirty: true });
  },

  setFieldScope: (fieldIds, scope, slotIndex) => {
    const idSet = new Set(fieldIds);
    const fields = get().fields.map((f) => {
      if (!idSet.has(f.id)) return f;
      if (scope === 'global') return { ...f, scope, slotIndex: null };
      // scope='item': preserve existing slot if present, else default to 0
      const nextSlot = slotIndex ?? (f.slotIndex ?? 0);
      return { ...f, scope, slotIndex: nextSlot };
    });
    set({ fields, isDirty: true });
    get().history.push(fields);
  },

  setFieldSlot: (fieldIds, slotIndex) => {
    const idSet = new Set(fieldIds);
    const fields = get().fields.map((f) => {
      if (!idSet.has(f.id)) return f;
      // Forcing a non-null slot implies scope='item'; null implies global.
      if (slotIndex === null) return { ...f, scope: 'global' as FieldScope, slotIndex: null };
      return { ...f, scope: 'item' as FieldScope, slotIndex };
    });
    set({ fields, isDirty: true });
    get().history.push(fields);
  },

  setFieldBinding: (fieldIds, bindingKey) => {
    const idSet = new Set(fieldIds);
    const fields = get().fields.map((f) => (idSet.has(f.id) ? { ...f, bindingKey } : f));
    set({ fields, isDirty: true });
    get().history.push(fields);
  },

  setActiveTool: (tool) => set({ activeTool: tool, selectedFieldIds: [] }),

  undo: () => {
    const fields = get().history.undo();
    if (fields) set({ fields, isDirty: true });
  },

  redo: () => {
    const fields = get().history.redo();
    if (fields) set({ fields, isDirty: true });
  },

  saveSnapshot: () => {
    get().history.push(get().fields);
  },

  setBatchOperation: (active) => set({ isBatchOperation: active }),

  setReplicationPreview: (sourceFieldIds, copies, offsetX, offsetY) => {
    const { fields } = get();
    const sourceFields = fields.filter((f) => sourceFieldIds.includes(f.id));
    if (sourceFields.length === 0) {
      set({ replicationPreview: null });
      return;
    }

    const ghosts: GhostField[] = [];
    for (let copyIdx = 1; copyIdx <= copies; copyIdx++) {
      for (const src of sourceFields) {
        const label = src.config.label ?? '';
        const newLabel = `${label} ${copyIdx + 1}`;
        ghosts.push({
          id: `ghost-${src.id}-${copyIdx}`,
          sourceId: src.id,
          type: src.type,
          pageIndex: src.pageIndex,
          position: {
            x: src.position.x + offsetX * copyIdx,
            y: src.position.y + offsetY * copyIdx,
            width: src.position.width,
            height: src.position.height,
          },
          config: { ...structuredClone(src.config), label: newLabel },
          copyIndex: copyIdx,
        });
      }
    }

    set({
      replicationPreview: { sourceFieldIds, copies, offsetX, offsetY, ghosts },
    });
  },

  clearReplicationPreview: () => set({ replicationPreview: null }),

  /**
   * Applies the replication preview. Each copy becomes an independent item-scope
   * field with its own slotIndex (copyIndex), so they act as distinct SX slots
   * sharing the same binding. Callers typically trigger this after dragging a
   * field plus N offset copies.
   */
  applyReplication: () => {
    const { replicationPreview, fields: currentFields } = get();
    if (!replicationPreview || replicationPreview.ghosts.length === 0) return [];

    const sourceIdSet = new Set(replicationPreview.sourceFieldIds);
    const sourceFieldMap = new Map(
      currentFields.filter((f) => sourceIdSet.has(f.id)).map((f) => [f.id, f]),
    );

    // Promote sources to item-scope with slotIndex=0 (if not already set).
    const updatedFields = currentFields.map((f) => {
      if (!sourceIdSet.has(f.id)) return f;
      return {
        ...f,
        scope: 'item' as FieldScope,
        slotIndex: f.slotIndex ?? 0,
      };
    });

    const newFields: EditorField[] = replicationPreview.ghosts.map((ghost) => {
      const source = sourceFieldMap.get(ghost.sourceId);
      return {
        id: crypto.randomUUID(),
        type: ghost.type,
        pageIndex: ghost.pageIndex,
        position: structuredClone(ghost.position),
        config: structuredClone(ghost.config),
        scope: 'item' as FieldScope,
        slotIndex: ghost.copyIndex,
        bindingKey: source?.bindingKey ?? null,
      };
    });

    const fields = [...updatedFields, ...newFields];
    set({ fields, isDirty: true, replicationPreview: null, selectedFieldIds: newFields.map((f) => f.id) });
    get().history.push(fields);
    return newFields;
  },

  markClean: () => set({ isDirty: false }),
}));

export type { EditorField };
