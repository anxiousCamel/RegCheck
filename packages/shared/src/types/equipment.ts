/** Loja (store location) summary */
export interface LojaDTO {
  id: string;
  nome: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Setor (sector) summary */
export interface SetorDTO {
  id: string;
  nome: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Tipo de Equipamento (equipment type) summary */
export interface TipoEquipamentoDTO {
  id: string;
  nome: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Equipment record with related data */
export interface EquipamentoDTO {
  id: string;
  lojaId: string;
  setorId: string;
  tipoId: string;
  numeroEquipamento: string;
  serie: string | null;
  patrimonio: string | null;
  glpiId: string | null;
  createdAt: string;
  updatedAt: string;
  loja?: LojaDTO;
  setor?: SetorDTO;
  tipo?: TipoEquipamentoDTO;
}

/** Filters for equipment listing */
export interface EquipamentoFilters {
  lojaId?: string;
  setorId?: string;
  tipoId?: string;
  numeroEquipamento?: string;
  serie?: string;
  search?: string;
}

/** Scan candidate from camera/OCR pipeline */
export interface ScanCandidate {
  value: string;
  confidence: number;
  source: 'barcode' | 'ocr';
}

/** Result from the scanning pipeline */
export interface ScanResult {
  serie: ScanCandidate[];
  patrimonio: ScanCandidate[];
  raw: string[];
}
