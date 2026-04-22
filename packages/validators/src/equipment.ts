import { z } from 'zod';

// --- Loja schemas ---
export const createLojaSchema = z.object({
  nome: z.string().min(1).max(200).trim(),
});

export const updateLojaSchema = z.object({
  nome: z.string().min(1).max(200).trim().optional(),
  ativo: z.boolean().optional(),
});

// --- Setor schemas ---
export const createSetorSchema = z.object({
  nome: z.string().min(1).max(200).trim(),
});

export const updateSetorSchema = z.object({
  nome: z.string().min(1).max(200).trim().optional(),
  ativo: z.boolean().optional(),
});

// --- Tipo Equipamento schemas ---
export const createTipoEquipamentoSchema = z.object({
  nome: z.string().min(1).max(200).trim(),
});

export const updateTipoEquipamentoSchema = z.object({
  nome: z.string().min(1).max(200).trim().optional(),
  ativo: z.boolean().optional(),
});

// --- Equipamento schemas ---
export const createEquipamentoSchema = z.object({
  lojaId: z.string().uuid(),
  setorId: z.string().uuid(),
  tipoId: z.string().uuid(),
  numeroEquipamento: z.string().min(1).max(100).trim(),
  serie: z.string().max(200).trim().optional(),
  patrimonio: z.string().max(200).trim().optional(),
  modelo: z.string().max(200).trim().optional(),
  ip: z.string().ip({ version: 'v4' }).optional(),
  glpiId: z.string().max(100).trim().optional(),
});

export const updateEquipamentoSchema = z.object({
  lojaId: z.string().uuid().optional(),
  setorId: z.string().uuid().optional(),
  tipoId: z.string().uuid().optional(),
  numeroEquipamento: z.string().min(1).max(100).trim().optional(),
  serie: z.string().max(200).trim().nullable().optional(),
  patrimonio: z.string().max(200).trim().nullable().optional(),
  modelo: z.string().max(200).trim().nullable().optional(),
  ip: z.string().ip({ version: 'v4' }).nullable().optional(),
  glpiId: z.string().max(100).trim().nullable().optional(),
});

export const equipamentoFilterSchema = z.object({
  lojaId: z.string().uuid().optional(),
  setorId: z.string().uuid().optional(),
  tipoId: z.string().uuid().optional(),
  numeroEquipamento: z.string().optional(),
  serie: z.string().optional(),
  search: z.string().optional(),
});

// Type exports
export type CreateLojaInput = z.infer<typeof createLojaSchema>;
export type UpdateLojaInput = z.infer<typeof updateLojaSchema>;
export type CreateSetorInput = z.infer<typeof createSetorSchema>;
export type UpdateSetorInput = z.infer<typeof updateSetorSchema>;
export type CreateTipoEquipamentoInput = z.infer<typeof createTipoEquipamentoSchema>;
export type UpdateTipoEquipamentoInput = z.infer<typeof updateTipoEquipamentoSchema>;
export type CreateEquipamentoInput = z.infer<typeof createEquipamentoSchema>;
export type UpdateEquipamentoInput = z.infer<typeof updateEquipamentoSchema>;
export type EquipamentoFilterInput = z.infer<typeof equipamentoFilterSchema>;
