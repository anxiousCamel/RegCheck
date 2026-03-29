-- Add equipment group (slot index) to template_fields
-- Run with: psql $DATABASE_URL -f add_equipment_group.sql

ALTER TABLE "template_fields" ADD COLUMN IF NOT EXISTS "equipmentGroup" INTEGER;

CREATE INDEX IF NOT EXISTS "template_fields_templateId_equipmentGroup_idx"
  ON "template_fields" ("templateId", "equipmentGroup");
