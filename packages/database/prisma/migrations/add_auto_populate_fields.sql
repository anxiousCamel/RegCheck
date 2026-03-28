-- Add autoPopulate support to template_fields
-- Run with: psql $DATABASE_URL -f add_auto_populate_fields.sql
-- Or use: npx prisma db push (from packages/database)

ALTER TABLE "template_fields"
  ADD COLUMN IF NOT EXISTS "autoPopulate" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "autoPopulateKey" TEXT;
