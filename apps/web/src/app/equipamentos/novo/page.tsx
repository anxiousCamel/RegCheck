'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Button } from '@regcheck/ui';
import { api } from '@/lib/api';
import { EquipmentForm } from '@/components/equipment/equipment-form';
import type { LojaDTO, SetorDTO, TipoEquipamentoDTO } from '@regcheck/shared';

export default function NovoEquipamentoPage() {
  const router = useRouter();

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

  const createMutation = useMutation({
    mutationFn: (data: {
      lojaId: string;
      setorId: string;
      tipoId: string;
      numeroEquipamento: string;
      serie?: string;
      patrimonio?: string;
      glpiId?: string;
    }) => api.createEquipamento(data),
    onSuccess: () => router.push('/equipamentos'),
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Novo Equipamento</h1>
          <p className="text-muted-foreground">Cadastre um novo equipamento</p>
        </div>
      </div>

      <EquipmentForm
        lojas={(lojas ?? []) as LojaDTO[]}
        setores={(setores ?? []) as SetorDTO[]}
        tipos={(tipos ?? []) as TipoEquipamentoDTO[]}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      {createMutation.isError && (
        <p className="text-sm text-destructive">
          Erro ao criar equipamento: {(createMutation.error as Error).message}
        </p>
      )}
    </div>
  );
}
