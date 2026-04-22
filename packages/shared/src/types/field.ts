/** Supported field types in the template editor */
export type FieldType = 'text' | 'image' | 'signature' | 'checkbox';

/**
 * Field scope:
 * - `global`: one value, rendered identically on every generated page
 * - `item`:   one value per item (SX slot), rendered on the page that holds the item
 */
export type FieldScope = 'global' | 'item';

/** Position and dimensions of a field on a page (relative coordinates 0-1) */
export interface FieldPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Configuration properties for a template field */
export interface FieldConfig {
  label: string;
  required: boolean;
  placeholder?: string;
  defaultValue?: string;
  fontSize?: number;
  fontFamily?: string;
  fontColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  textAlign?: 'left' | 'center' | 'right';
  maxLength?: number;
}

/** A field definition within a template */
export interface TemplateField {
  id: string;
  type: FieldType;
  /** Page index in the original (un-expanded) PDF this field belongs to */
  pageIndex: number;
  position: FieldPosition;
  config: FieldConfig;
  /** Whether this field appears once per document (global) or once per item (SX) */
  scope: FieldScope;
  /**
   * Slot index of an SX placeholder on the page (0..N-1).
   * Must be `null` for scope='global'; must be a non-negative integer for scope='item'.
   */
  slotIndex: number | null;
  /**
   * Optional auto-population binding. Free-form `<namespace>.<key>` string.
   *   - `global.<key>`: resolved from the document's global data context
   *   - `eq.<key>`:     resolved from the equipment record at the field's itemIndex
   * `null` means the field is filled manually.
   */
  bindingKey: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Data filled into a field by the user */
export interface FilledFieldData {
  fieldId: string;
  /** Which item this value belongs to (0-based). Always 0 for scope='global' fields. */
  itemIndex: number;
  value: string | boolean;
  /** For image/signature fields, the storage key */
  fileKey?: string;
}
