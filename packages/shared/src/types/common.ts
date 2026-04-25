/** Tipo recursivo para dados JSON vindos do Prisma (substitui `unknown` e `any` em campos JSON) */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** Tipo para metadados de documento (substitui `as any` em metadata) */
export interface DocumentMetadata {
  assignments?: Array<{
    itemIndex: number;
    setorId: string;
    setorNome: string;
    equipamentoId: string;
    numeroEquipamento?: string;
  }>;
  itemsPerPage?: number;
  totalPages?: number;
  fillMode?: string;
  totalSlots?: number;
}

/**
 * Tipo utilitário: torna propriedades opcionais realmente ausentes
 * (compatível com exactOptionalPropertyTypes)
 */
export type StrictOptional<T, K extends keyof T> = Omit<T, K> & {
  [P in K]?: T[P];
};
