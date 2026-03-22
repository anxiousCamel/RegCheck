/** Supported field types in the template editor */
export type FieldType = 'text' | 'image' | 'signature' | 'checkbox';

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
  pageIndex: number;
  position: FieldPosition;
  config: FieldConfig;
  /** Group identifier for repetition cloning */
  repetitionGroupId?: string;
  /** Order within the repetition group */
  repetitionIndex?: number;
  createdAt: string;
  updatedAt: string;
}

/** Data filled into a field by the user */
export interface FilledFieldData {
  fieldId: string;
  /** Which repetition item this belongs to (0-based) */
  itemIndex: number;
  value: string | boolean;
  /** For image/signature fields, the storage key */
  fileKey?: string;
}
