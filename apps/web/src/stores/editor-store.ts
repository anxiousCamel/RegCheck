'use client';

import { create } from 'zustand';
import type { FieldType, FieldPosition, FieldConfig } from '@regcheck/shared';
import { HistoryManager } from '@regcheck/editor-engine';

interface EditorField {
  id: string;
  type: FieldType;
  pageIndex: number;
  position: FieldPosition;
  config: FieldConfig;
  repetitionGroupId?: string;
}

interface EditorState {
  fields: EditorField[];
  /** Set of selected field IDs (supports multi-select) */
  selectedFieldIds: string[];
  /** Clipboard for copy/paste */
  clipboard: EditorField[];
  currentPage: number;
  totalPages: number;
  zoom: number;
  snapEnabled: boolean;
  gridSize: number;
  activeTool: FieldType | null;
  isDirty: boolean;
  history: HistoryManager<EditorField[]>;

  // Actions
  setFields: (fields: EditorField[]) => void;
  addField: (field: EditorField) => void;
  updateField: (id: string, updates: Partial<EditorField>) => void;
  updateFieldId: (oldId: string, newId: string) => void;
  removeField: (id: string) => void;
  removeFields: (ids: string[]) => void;
  /** Select a single field (clears multi-select) */
  selectField: (id: string | null) => void;
  /** Toggle field in multi-select (Shift+Click) */
  toggleFieldSelection: (id: string) => void;
  /** Copy selected fields to clipboard */
  copyFields: () => void;
  /** Paste fields from clipboard with new IDs */
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

  /** Derived: first selected field ID (backward compat) */
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
    set({ fields, selectedFieldIds });
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
    set({ clipboard: selected });
  },

  pasteFields: () => {
    const { clipboard, currentPage } = get();
    if (clipboard.length === 0) return [];

    const OFFSET = 0.02;
    const newFields = clipboard.map((f) => ({
      ...f,
      id: crypto.randomUUID(),
      pageIndex: currentPage,
      position: {
        ...f.position,
        x: Math.min(f.position.x + OFFSET, 1 - f.position.width),
        y: Math.min(f.position.y + OFFSET, 1 - f.position.height),
      },
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

  markClean: () => set({ isDirty: false }),
}));

export type { EditorField };
