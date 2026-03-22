'use client';

import { create } from 'zustand';
import type { FieldType, FieldPosition, FieldConfig, TemplateField } from '@regcheck/shared';
import { HistoryManager } from '@regcheck/editor-engine';

/**
 * Editor state management using Zustand.
 *
 * Chose Zustand over React Query for the editor because:
 * - Editor state is highly interactive (drag, resize, select) - needs synchronous updates
 * - React Query is used for server-state (API data fetching/caching)
 * - Zustand provides simple, fast state updates without re-render overhead
 * - Built-in support for middleware (devtools, persist)
 */

interface EditorField {
  id: string;
  type: FieldType;
  pageIndex: number;
  position: FieldPosition;
  config: FieldConfig;
  repetitionGroupId?: string;
}

interface EditorState {
  /** All fields in the editor */
  fields: EditorField[];
  /** Currently selected field ID */
  selectedFieldId: string | null;
  /** Current page being viewed */
  currentPage: number;
  /** Total pages */
  totalPages: number;
  /** Zoom level (1 = 100%) */
  zoom: number;
  /** Snap grid enabled */
  snapEnabled: boolean;
  /** Grid cell size in px */
  gridSize: number;
  /** Active tool for creating new fields */
  activeTool: FieldType | null;
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Undo/redo history */
  history: HistoryManager<EditorField[]>;

  // Actions
  setFields: (fields: EditorField[]) => void;
  addField: (field: EditorField) => void;
  updateField: (id: string, updates: Partial<EditorField>) => void;
  removeField: (id: string) => void;
  selectField: (id: string | null) => void;
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
}

export const useEditorStore = create<EditorState>((set, get) => ({
  fields: [],
  selectedFieldId: null,
  currentPage: 0,
  totalPages: 1,
  zoom: 1,
  snapEnabled: true,
  gridSize: 10,
  activeTool: null,
  isDirty: false,
  history: new HistoryManager<EditorField[]>(50),

  setFields: (fields) => {
    set({ fields, isDirty: false });
    get().history.push(fields);
  },

  addField: (field) => {
    const fields = [...get().fields, field];
    set({ fields, isDirty: true, selectedFieldId: field.id });
    get().history.push(fields);
  },

  updateField: (id, updates) => {
    const fields = get().fields.map((f) => (f.id === id ? { ...f, ...updates } : f));
    set({ fields, isDirty: true });
  },

  removeField: (id) => {
    const fields = get().fields.filter((f) => f.id !== id);
    const selectedFieldId = get().selectedFieldId === id ? null : get().selectedFieldId;
    set({ fields, selectedFieldId, isDirty: true });
    get().history.push(fields);
  },

  selectField: (id) => set({ selectedFieldId: id }),

  setCurrentPage: (page) => set({ currentPage: page, selectedFieldId: null }),
  setTotalPages: (total) => set({ totalPages: total }),

  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(3, zoom)) }),
  zoomIn: () => set((s) => ({ zoom: Math.min(3, s.zoom + 0.25) })),
  zoomOut: () => set((s) => ({ zoom: Math.max(0.25, s.zoom - 0.25) })),

  setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
  setGridSize: (size) => set({ gridSize: size }),
  setActiveTool: (tool) => set({ activeTool: tool, selectedFieldId: null }),

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
