-- Refactor template_fields: replace equipmentGroup / autoPopulate* / repetition* with
-- scope / slotIndex / bindingKey. Drop Template.repetitionConfig.
--
-- Backfill strategy:
--   * scope:      'item' when equipmentGroup IS NOT NULL, else 'global'
--   * slotIndex:  copied from equipmentGroup
--   * bindingKey: prefixed 'eq.' + autoPopulateKey when set; otherwise null
-- Legacy repetition* columns are dropped (no production use).

ALTER TABLE "template_fields" ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'item';
ALTER TABLE "template_fields" ADD COLUMN "slotIndex" INTEGER;
ALTER TABLE "template_fields" ADD COLUMN "bindingKey" TEXT;

UPDATE "template_fields"
SET
  "scope" = CASE WHEN "equipmentGroup" IS NULL THEN 'global' ELSE 'item' END,
  "slotIndex" = "equipmentGroup",
  "bindingKey" = CASE
    WHEN "autoPopulate" = TRUE AND "autoPopulateKey" IS NOT NULL
      THEN 'eq.' || "autoPopulateKey"
    ELSE NULL
  END;

DROP INDEX IF EXISTS "template_fields_repetitionGroupId_idx";
DROP INDEX IF EXISTS "template_fields_templateId_equipmentGroup_idx";

ALTER TABLE "template_fields" DROP COLUMN "repetitionGroupId";
ALTER TABLE "template_fields" DROP COLUMN "repetitionIndex";
ALTER TABLE "template_fields" DROP COLUMN "autoPopulate";
ALTER TABLE "template_fields" DROP COLUMN "autoPopulateKey";
ALTER TABLE "template_fields" DROP COLUMN "equipmentGroup";

CREATE INDEX "template_fields_templateId_slotIndex_idx" ON "template_fields"("templateId", "slotIndex");

ALTER TABLE "templates" DROP COLUMN "repetitionConfig";
