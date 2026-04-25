'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input, Spinner } from '@regcheck/ui';
import { IconCheck, IconX, IconSearch } from '@/components/ui/icons';
import { api } from '@/lib/api';

interface EquipmentSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  tipoEquipamentoId?: string;
  onSelect: (equipamentoId: string) => void;
}

export function EquipmentSelectModal({
  isOpen,
  onClose,
  tipoEquipamentoId,
  onSelect,
}: EquipmentSelectModalProps) {
  const [search, setSearch] = useState('');
  const [selectedLojaId, setSelectedLojaId] = useState<string>('');
  const [selectedTipoId, setSelectedTipoId] = useState<string>(tipoEquipamentoId || '');

  // Fetch lojas for filter
  const { data: lojasData } = useQuery({
    queryKey: ['lojas-active'],
    queryFn: () => api.listActiveLojas(),
    enabled: isOpen,
  });

  // Fetch tipos for filter (only when no tipo is pre-specified)
  const { data: tiposData } = useQuery({
    queryKey: ['tipos-active'],
    queryFn: () => api.listActiveTipos(),
    enabled: isOpen && !tipoEquipamentoId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['equipamentos-por-tipo', selectedTipoId, selectedLojaId, search],
    queryFn: () =>
      api.listEquipamentos(1, 50, {
        ...(selectedTipoId ? { tipoId: selectedTipoId } : {}),
        ...(selectedLojaId ? { lojaId: selectedLojaId } : {}),
        ...(search ? { search } : {}),
      }),
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const equipments = data?.items ?? [];
  const lojas = lojasData ?? [];
  const tipos = tiposData ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex-1">
            <h2 className="text-lg font-extrabold text-foreground tracking-tight">
              Selecionar Equipamento
            </h2>
            {tipoEquipamentoId && (
              <p className="text-xs text-muted-foreground mt-0.5">Filtrado por tipo específico</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 bg-muted hover:bg-border rounded-full text-muted-foreground transition-colors"
          >
            <IconX size={16} />
          </button>
        </div>

        <div className="p-4 border-b border-border bg-white space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!tipoEquipamentoId && tipos.length > 0 && (
              <select
                value={selectedTipoId}
                onChange={(e) => setSelectedTipoId(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-muted/30 px-3 text-sm font-medium focus:border-primary focus:bg-white transition-all"
              >
                <option value="">Todos os tipos</option>
                {tipos.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nome}
                  </option>
                ))}
              </select>
            )}

            {lojas.length > 0 && (
              <select
                value={selectedLojaId}
                onChange={(e) => setSelectedLojaId(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-muted/30 px-3 text-sm font-medium focus:border-primary focus:bg-white transition-all"
              >
                <option value="">Todas as lojas</option>
                {lojas.map((loja) => (
                  <option key={loja.id} value={loja.id}>
                    {loja.nome}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="relative">
            <IconSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <Input
              placeholder="Buscar número, série, patrimônio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11 bg-muted/30 border-transparent focus:border-primary focus:bg-white transition-all rounded-xl text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
              <Spinner className="w-8 h-8 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider">Buscando...</span>
            </div>
          ) : equipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <IconSearch className="text-muted-foreground" size={24} />
              </div>
              <p className="text-sm font-bold text-foreground">Nenhum equipamento encontrado</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tente buscar com outros termos ou verifique se há equipamentos cadastrados.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {equipments.map((eq) => (
                <button
                  key={eq.id}
                  onClick={() => onSelect(eq.id)}
                  className="w-full text-left p-3 rounded-xl hover:bg-muted focus:bg-muted transition-colors group flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="font-extrabold text-sm text-foreground group-hover:text-primary transition-colors">
                      {eq.numeroEquipamento}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {eq.tipo?.nome && `${eq.tipo.nome} • `}
                      {eq.loja?.nome && `${eq.loja.nome} • `}
                      {eq.setor?.nome}
                      {eq.serie ? ` • Série: ${eq.serie}` : ''}
                      {eq.patrimonio ? ` • Pat: ${eq.patrimonio}` : ''}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <IconCheck size={16} className="stroke-[3]" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
