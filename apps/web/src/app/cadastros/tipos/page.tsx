'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CrudTable } from '@/components/equipment/crud-table';
import type { TipoEquipamentoDTO } from '@regcheck/shared';

export default function TiposPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['tipos'],
    queryFn: () => api.listTipos(),
  });

  const createMutation = useMutation({
    mutationFn: (nome: string) => api.createTipo({ nome }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tipos'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, nome }: { id: string; nome: string }) => api.updateTipo(id, { nome }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tipos'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.toggleTipo(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tipos'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTipo(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tipos'] }),
  });

  return (
    <CrudTable
      title="Tipos de Equipamento"
      description="Gerencie os tipos de equipamento do sistema"
      items={(data?.items ?? []) as TipoEquipamentoDTO[]}
      isLoading={isLoading}
      onCreate={(nome) => createMutation.mutate(nome)}
      onUpdate={(id, nome) => updateMutation.mutate({ id, nome })}
      onToggle={(id) => toggleMutation.mutate(id)}
      onDelete={(id) => deleteMutation.mutate(id)}
      isCreating={createMutation.isPending}
    />
  );
}
