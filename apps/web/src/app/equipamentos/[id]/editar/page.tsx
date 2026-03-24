'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { Button, Spinner } from '@regcheck/ui';
import { api } from '@/lib/api';
import { EquipmentForm } from '@/components/equipment/equipment-form';
import type { LojaDTO, SetorDTO, TipoEquipamentoDTO, EquipamentoDTO } from '@regcheck/shared';

export default function EditarEquipamentoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: equipamento, isLoading: loadingEquip } = useQuery({
    queryKey: ['equipamento', id],
    queryFn: () => api.getEquipamento(id),
  });

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

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.updateEquipamento(id, data),
    onSuccess: () => router.push('/equipamentos'),
  });

  if (loadingEquip) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Editar Equipamento</h1>
          <p className="text-muted-foreground">Atualize os dados do equipamento</p>
        </div>
      </div>

      <EquipmentForm
        initialData={equipamento as EquipamentoDTO}
        lojas={(lojas ?? []) as LojaDTO[]}
        setores={(setores ?? []) as SetorDTO[]}
        tipos={(tipos ?? []) as TipoEquipamentoDTO[]}
        onSubmit={(data) => updateMutation.mutate(data)}
        isLoading={updateMutation.isPending}
      />

      {updateMutation.isError && (
        <p className="text-sm text-destructive">
          Erro ao atualizar: {(updateMutation.error as Error).message}
        </p>
      )}
    </div>
  );
}
