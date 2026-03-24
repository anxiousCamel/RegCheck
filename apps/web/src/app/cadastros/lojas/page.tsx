'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CrudTable } from '@/components/equipment/crud-table';
import type { LojaDTO } from '@regcheck/shared';

export default function LojasPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['lojas'],
    queryFn: () => api.listLojas(),
  });

  const createMutation = useMutation({
    mutationFn: (nome: string) => api.createLoja({ nome }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lojas'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, nome }: { id: string; nome: string }) => api.updateLoja(id, { nome }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lojas'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.toggleLoja(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lojas'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteLoja(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lojas'] }),
  });

  return (
    <CrudTable
      title="Lojas"
      description="Gerencie as lojas/filiais do sistema"
      items={(data?.items ?? []) as LojaDTO[]}
      isLoading={isLoading}
      onCreate={(nome) => createMutation.mutate(nome)}
      onUpdate={(id, nome) => updateMutation.mutate({ id, nome })}
      onToggle={(id) => toggleMutation.mutate(id)}
      onDelete={(id) => deleteMutation.mutate(id)}
      isCreating={createMutation.isPending}
    />
  );
}
