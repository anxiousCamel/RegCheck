'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Button, Spinner } from '@regcheck/ui';
import { api } from '@/lib/api';
import { EquipmentFilters } from '@/components/equipment/equipment-filters';
import type { EquipamentoDTO, LojaDTO, SetorDTO, TipoEquipamentoDTO } from '@regcheck/shared';

export default function EquipamentosPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const pageSize = 20;

  const { data: lojas } = useQuery({
    queryKey: ['lojas-active'],
    queryFn: () => api.listActiveLojas(),
  });

  const { data: setores } = useQuery({
    queryKey: ['setores-active'],
    queryFn: () => api.listActiveSetores(),
  });

  const { data: tipos } = useQuery({
    queryKey: ['tipos-active'],
    queryFn: () => api.listActiveTipos(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['equipamentos', page, pageSize, filters],
    queryFn: () => api.listEquipamentos(page, pageSize, filters),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteEquipamento(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipamentos'] }),
  });

  const handleFiltersChange = (newFilters: Record<string, string>) => {
    setFilters(newFilters);
    setPage(1);
  };

  const items = (data?.items ?? []) as EquipamentoDTO[];
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipamentos</h1>
          <p className="text-muted-foreground">
            Gerencie o cadastro de equipamentos
            {data ? ` (${data.total} registros)` : ''}
          </p>
        </div>
        <Link href="/equipamentos/novo">
          <Button>Novo Equipamento</Button>
        </Link>
      </div>

      <EquipmentFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        lojas={(lojas ?? []) as LojaDTO[]}
        setores={(setores ?? []) as SetorDTO[]}
        tipos={(tipos ?? []) as TipoEquipamentoDTO[]}
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 text-sm font-medium">Loja</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Setor</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Nº Equip.</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Série</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Patrimônio</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">GLPI</th>
                  <th className="text-right px-4 py-3 text-sm font-medium w-36">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((eq) => (
                  <tr key={eq.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm">{eq.loja?.nome ?? '-'}</td>
                    <td className="px-4 py-3 text-sm">{eq.setor?.nome ?? '-'}</td>
                    <td className="px-4 py-3 text-sm">{eq.tipo?.nome ?? '-'}</td>
                    <td className="px-4 py-3 text-sm font-mono">{eq.numeroEquipamento}</td>
                    <td className="px-4 py-3 text-sm font-mono">{eq.serie ?? '-'}</td>
                    <td className="px-4 py-3 text-sm font-mono">{eq.patrimonio ?? '-'}</td>
                    <td className="px-4 py-3 text-sm font-mono">{eq.glpiId ?? '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <Link href={`/equipamentos/${eq.id}/editar`}>
                          <Button variant="outline" size="sm">Editar</Button>
                        </Link>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteMutation.mutate(eq.id)}
                          disabled={deleteMutation.isPending}
                        >
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-muted-foreground">
                      Nenhum equipamento encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
