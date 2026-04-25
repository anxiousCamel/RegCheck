# Performance Indexes Migration

This migration adds database indexes to optimize query performance for the RegCheck application.

## Indexes Added

### Equipamento Table

- `equipamentos_tipoId_lojaId_idx`: Composite index on (tipoId, lojaId) for filtering equipment by type and store
- `equipamentos_setorId_idx`: Index on setorId for filtering by sector
- `equipamentos_numeroEquipamento_idx`: Index on numeroEquipamento for equipment number lookups

### Document Table

- `documents_templateId_idx`: Index on templateId for filtering documents by template
- `documents_status_idx`: Index on status for filtering by document status
- `documents_createdAt_idx`: Descending index on createdAt for sorting recent documents

### Template Table

- `templates_status_idx`: Index on status for filtering by template status
- `templates_createdAt_idx`: Descending index on createdAt for sorting recent templates

### TemplateField Table

- `template_fields_templateId_idx`: Index on templateId for field lookups by template

## Performance Impact

These indexes are designed to optimize:

- Equipment filtering by type, store, and sector
- Document and template listing with status filters
- Sorting by creation date (most recent first)
- Template field lookups

## Expected Query Performance

- Listing queries: < 200ms
- Detail queries: < 150ms
- Database query execution: < 50ms

## Related Requirements

- Requirement 5.1: Database Query Optimization
- Task 4.1: Create database migration for performance indexes
