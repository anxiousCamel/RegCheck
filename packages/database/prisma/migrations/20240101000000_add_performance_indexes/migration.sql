-- Add performance indexes for page load optimization

-- Drop existing single-column indexes that will be replaced by composite or DESC indexes
DROP INDEX IF EXISTS "templates_createdAt_idx";
DROP INDEX IF EXISTS "documents_createdAt_idx";

-- Equipamento indexes
-- Add composite index on Equipamento(tipoId, lojaId) for filtering by type and store
CREATE INDEX IF NOT EXISTS "equipamentos_tipoId_lojaId_idx" ON "equipamentos"("tipoId", "lojaId");

-- Add index on Equipamento(setorId) for filtering by sector
CREATE INDEX IF NOT EXISTS "equipamentos_setorId_idx" ON "equipamentos"("setorId");

-- Add index on Equipamento(numeroEquipamento) for equipment number lookups
CREATE INDEX IF NOT EXISTS "equipamentos_numeroEquipamento_idx" ON "equipamentos"("numeroEquipamento");

-- Document indexes
-- Add index on Document(templateId) for filtering documents by template
CREATE INDEX IF NOT EXISTS "documents_templateId_idx" ON "documents"("templateId");

-- Add index on Document(status) for filtering by status
CREATE INDEX IF NOT EXISTS "documents_status_idx" ON "documents"("status");

-- Add DESC index on Document(createdAt) for sorting recent documents
CREATE INDEX IF NOT EXISTS "documents_createdAt_idx" ON "documents"("createdAt" DESC);

-- Template indexes
-- Add index on Template(status) for filtering by status
CREATE INDEX IF NOT EXISTS "templates_status_idx" ON "templates"("status");

-- Add DESC index on Template(createdAt) for sorting recent templates
CREATE INDEX IF NOT EXISTS "templates_createdAt_idx" ON "templates"("createdAt" DESC);

-- Field indexes
-- Add index on TemplateField(templateId) for field lookups by template
CREATE INDEX IF NOT EXISTS "template_fields_templateId_idx" ON "template_fields"("templateId");
