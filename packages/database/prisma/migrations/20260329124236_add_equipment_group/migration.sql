-- CreateEnum
CREATE TYPE "TemplateStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'IMAGE', 'SIGNATURE', 'CHECKBOX');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'GENERATING', 'GENERATED', 'ERROR');

-- CreateTable
CREATE TABLE "pdf_files" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pdf_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "TemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "pdfFileId" TEXT NOT NULL,
    "repetitionConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_versions" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_fields" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "pageIndex" INTEGER NOT NULL,
    "position" JSONB NOT NULL,
    "config" JSONB NOT NULL,
    "repetitionGroupId" TEXT,
    "repetitionIndex" INTEGER,
    "autoPopulate" BOOLEAN NOT NULL DEFAULT false,
    "autoPopulateKey" TEXT,
    "equipmentGroup" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "totalItems" INTEGER NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "generatedPdfKey" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filled_fields" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "itemIndex" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "fileKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "filled_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lojas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lojas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setores" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "setores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_equipamento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_equipamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipamentos" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "setorId" TEXT NOT NULL,
    "tipoId" TEXT NOT NULL,
    "numeroEquipamento" TEXT NOT NULL,
    "serie" TEXT,
    "patrimonio" TEXT,
    "glpiId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pdf_files_fileKey_key" ON "pdf_files"("fileKey");

-- CreateIndex
CREATE INDEX "templates_status_idx" ON "templates"("status");

-- CreateIndex
CREATE INDEX "templates_createdAt_idx" ON "templates"("createdAt");

-- CreateIndex
CREATE INDEX "template_versions_templateId_idx" ON "template_versions"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "template_versions_templateId_version_key" ON "template_versions"("templateId", "version");

-- CreateIndex
CREATE INDEX "template_fields_templateId_pageIndex_idx" ON "template_fields"("templateId", "pageIndex");

-- CreateIndex
CREATE INDEX "template_fields_repetitionGroupId_idx" ON "template_fields"("repetitionGroupId");

-- CreateIndex
CREATE INDEX "template_fields_templateId_equipmentGroup_idx" ON "template_fields"("templateId", "equipmentGroup");

-- CreateIndex
CREATE INDEX "documents_templateId_idx" ON "documents"("templateId");

-- CreateIndex
CREATE INDEX "documents_status_idx" ON "documents"("status");

-- CreateIndex
CREATE INDEX "documents_createdAt_idx" ON "documents"("createdAt");

-- CreateIndex
CREATE INDEX "filled_fields_documentId_idx" ON "filled_fields"("documentId");

-- CreateIndex
CREATE INDEX "filled_fields_fieldId_idx" ON "filled_fields"("fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "filled_fields_documentId_fieldId_itemIndex_key" ON "filled_fields"("documentId", "fieldId", "itemIndex");

-- CreateIndex
CREATE UNIQUE INDEX "lojas_nome_key" ON "lojas"("nome");

-- CreateIndex
CREATE INDEX "lojas_ativo_idx" ON "lojas"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "setores_nome_key" ON "setores"("nome");

-- CreateIndex
CREATE INDEX "setores_ativo_idx" ON "setores"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_equipamento_nome_key" ON "tipos_equipamento"("nome");

-- CreateIndex
CREATE INDEX "tipos_equipamento_ativo_idx" ON "tipos_equipamento"("ativo");

-- CreateIndex
CREATE INDEX "equipamentos_lojaId_idx" ON "equipamentos"("lojaId");

-- CreateIndex
CREATE INDEX "equipamentos_setorId_idx" ON "equipamentos"("setorId");

-- CreateIndex
CREATE INDEX "equipamentos_tipoId_idx" ON "equipamentos"("tipoId");

-- CreateIndex
CREATE INDEX "equipamentos_serie_idx" ON "equipamentos"("serie");

-- CreateIndex
CREATE INDEX "equipamentos_patrimonio_idx" ON "equipamentos"("patrimonio");

-- CreateIndex
CREATE INDEX "equipamentos_numeroEquipamento_idx" ON "equipamentos"("numeroEquipamento");

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_pdfFileId_fkey" FOREIGN KEY ("pdfFileId") REFERENCES "pdf_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_fields" ADD CONSTRAINT "template_fields_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "filled_fields" ADD CONSTRAINT "filled_fields_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "filled_fields" ADD CONSTRAINT "filled_fields_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "template_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_setorId_fkey" FOREIGN KEY ("setorId") REFERENCES "setores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "tipos_equipamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
