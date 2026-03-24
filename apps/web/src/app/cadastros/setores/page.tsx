'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CrudTable } from '@/components/equipment/crud-table';
import type { SetorDTO } from '@regcheck/shared';

export default function SetoresPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['setores'],
    queryFn: () => api.listSetores(),
  });

  const createMutation = useMutation({
    mutationFn: (nome: string) => api.createSetor({ nome }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['setores'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, nome }: { id: string; nome: string }) => api.updateSetor(id, { nome }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['setores'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.toggleSetor(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['setores'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteSetor(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['setores'] }),
  });

  return (
    <CrudTable
      title="Setores"
      description="Gerencie os setores do sistema"
      items={(data?.items ?? []) as SetorDTO[]}
      isLoading={isLoading}
      onCreate={(nome) => createMutation.mutate(nome)}
      onUpdate={(id, nome) => updateMutation.mutate({ id, nome })}
      onToggle={(id) => toggleMutation.mutate(id)}
      onDelete={(id) => deleteMutation.mutate(id)}
      isCreating={createMutation.isPending}
    />
  );
}
