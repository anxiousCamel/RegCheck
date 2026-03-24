'use client';

import { Button, Input } from '@regcheck/ui';
import type { LojaDTO, SetorDTO, TipoEquipamentoDTO } from '@regcheck/shared';

interface EquipmentFiltersProps {
  filters: Record<string, string>;
  onFiltersChange: (filters: Record<string, string>) => void;
  lojas: LojaDTO[];
  setores: SetorDTO[];
  tipos: TipoEquipamentoDTO[];
}

export function EquipmentFilters({
  filters,
  onFiltersChange,
  lojas,
  setores,
  tipos,
}: EquipmentFiltersProps) {
  const updateFilter = (key: string, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasFilters = Object.values(filters).some((v) => v);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="text-xs font-medium mb-1 block text-muted-foreground">Loja</label>
          <select
            value={filters.lojaId ?? ''}
            onChange={(e) => updateFilter('lojaId', e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            {lojas.map((l) => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block text-muted-foreground">Setor</label>
          <select
            value={filters.setorId ?? ''}
            onChange={(e) => updateFilter('setorId', e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {setores.map((s) => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block text-muted-foreground">Tipo</label>
          <select
            value={filters.tipoId ?? ''}
            onChange={(e) => updateFilter('tipoId', e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block text-muted-foreground">Nº Equipamento</label>
          <Input
            value={filters.numeroEquipamento ?? ''}
            onChange={(e) => updateFilter('numeroEquipamento', e.target.value)}
            placeholder="Filtrar por número"
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block text-muted-foreground">Série</label>
          <Input
            value={filters.serie ?? ''}
            onChange={(e) => updateFilter('serie', e.target.value)}
            placeholder="Filtrar por série"
          />
        </div>
      </div>
      {hasFilters && (
        <Button variant="outline" size="sm" onClick={clearFilters}>
          Limpar Filtros
        </Button>
      )}
    </div>
  );
}
