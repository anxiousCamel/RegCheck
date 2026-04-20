'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Spinner, Badge, cn } from '@regcheck/ui';
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
    <div className="p-4 sm:p-8 space-y-8 bg-background/50">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <h1 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase">Equipamentos</h1>
             {data && (
                <Badge variant="outline" className="font-bold border-primary/20 text-primary bg-primary/5">
                  {data.total}
                </Badge>
             )}
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            Gerencie o inventário técnico de todas as unidades
          </p>
        </div>
        <Link href="/equipamentos/novo">
          <Button className="w-full sm:w-auto h-12 sm:h-10 gap-2 font-bold shadow-lg shadow-primary/20">
            <Plus className="h-5 w-5" />
            Novo Equipamento
          </Button>
        </Link>
      </div>

      <div className="bg-card border-2 rounded-3xl p-1 shadow-sm">
        <EquipmentFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          lojas={(lojas ?? []) as LojaDTO[]}
          setores={(setores ?? []) as SetorDTO[]}
          tipos={(tipos ?? []) as TipoEquipamentoDTO[]}
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Spinner className="h-10 w-10 text-primary" />
          <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Sincronizando inventário...</span>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block border-2 rounded-3xl overflow-hidden bg-card shadow-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-6 py-4 text-[11px] font-black uppercase tracking-wider text-muted-foreground">Localização / Setor</th>
                  <th className="text-left px-6 py-4 text-[11px] font-black uppercase tracking-wider text-muted-foreground">Tipo</th>
                  <th className="text-left px-6 py-4 text-[11px] font-black uppercase tracking-wider text-muted-foreground">Identificadores</th>
                  <th className="text-left px-6 py-4 text-[11px] font-black uppercase tracking-wider text-muted-foreground">Série / Pat.</th>
                  <th className="text-right px-6 py-4 text-[11px] font-black uppercase tracking-wider text-muted-foreground w-48">Gestão</th>
                </tr>
              </thead>
              <tbody>
                {items.map((eq) => (
                  <tr key={eq.id} className="border-b last:border-0 hover:bg-primary/[0.01] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-foreground">{eq.loja?.nome ?? '-'}</span>
                        <span className="text-xs text-muted-foreground font-medium">{eq.setor?.nome ?? '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="font-bold text-[10px] uppercase">{eq.tipo?.nome ?? '-'}</Badge>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col">
                         <span className="font-black text-primary text-sm tracking-tight">#{eq.numeroEquipamento}</span>
                         {eq.glpiId && <span className="text-[10px] text-muted-foreground font-bold uppercase">GLPI: {eq.glpiId}</span>}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col font-mono text-[11px] text-muted-foreground">
                        <span className="truncate max-w-[120px]">S: {eq.serie ?? '-'}</span>
                        <span>P: {eq.patrimonio ?? '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/equipamentos/${eq.id}/editar`}>
                          <Button variant="outline" size="sm" className="h-9 border-2 font-bold gap-2">
                            <Edit className="h-4 w-4" />
                            Editar
                          </Button>
                        </Link>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm('Excluir este equipamento definitivamente?')) {
                              deleteMutation.mutate(eq.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="h-9 font-bold"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-4">
            {items.map((eq) => (
              <div key={eq.id} className="border-2 rounded-2xl p-5 bg-card space-y-4 shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-start border-b pb-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase text-primary/70 tracking-widest">Identificação</span>
                    <span className="text-xl font-black tracking-tighter text-primary">#{eq.numeroEquipamento}</span>
                  </div>
                  <Badge variant="secondary" className="font-bold text-[10px] uppercase px-2 py-0.5">
                    {eq.tipo?.nome ?? '-'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black uppercase text-muted-foreground/60">Local</span>
                    <p className="text-xs font-bold truncate">{eq.loja?.nome ?? '-'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black uppercase text-muted-foreground/60">Setor</span>
                    <p className="text-xs font-bold truncate">{eq.setor?.nome ?? '-'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black uppercase text-muted-foreground/60">Série</span>
                    <p className="text-[11px] font-mono font-bold truncate">{eq.serie ?? '-'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black uppercase text-muted-foreground/60">Patrimônio</span>
                    <p className="text-[11px] font-mono font-bold truncate">{eq.patrimonio ?? '-'}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Link href={`/equipamentos/${eq.id}/editar`} className="flex-1">
                    <Button variant="outline" className="w-full h-11 border-2 font-bold gap-2">
                      <Edit className="h-4 w-4" />
                      Editar
                    </Button>
                  </Link>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (confirm('Deseja excluir este equipamento?')) {
                        deleteMutation.mutate(eq.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="h-11 px-4"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-tight">
                Página <span className="text-foreground">{page}</span> de <span className="text-foreground">{totalPages}</span>
              </p>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex-1 sm:flex-none h-11 sm:h-9 border-2 font-bold gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex-1 sm:flex-none h-11 sm:h-9 border-2 font-bold gap-1"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
