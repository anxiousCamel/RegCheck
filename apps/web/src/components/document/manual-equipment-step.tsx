'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TemplateField, ItemAssignment } from '@regcheck/shared';
import { Button, Badge, Spinner } from '@regcheck/ui';
import { IconChevronLeft, IconChevronRight, IconCheck, IconSearch, IconRefresh } from '@/components/ui/icons'; 
import { EquipmentStep } from './fill-wizard';
import { EquipmentSelectModal } from './equipment-select-modal';
import { api } from '@/lib/api';

interface ManualEquipmentStepProps {
  documentId: string;
  slotIndex: number;
  totalSlots: number;
  assignment: ItemAssignment | null;
  fields: TemplateField[];
  tipoEquipamentoId: string | undefined;
  tipoEquipamentoNome: string | undefined;
  getValue: (id: string, index: number) => string | boolean;
  updateField: (id: string, index: number, value: string | boolean) => void;
  onImageChange: (id: string, index: number, file: File) => void;
  getFileKey: (id: string, index: number) => string | undefined;
  getPendingBlobForField: (id: string, index: number) => Blob | undefined;
  onNext: () => void;
  onPrev: () => void;
  isLast: boolean;
}

export function ManualEquipmentStep({
  documentId,
  slotIndex,
  totalSlots,
  assignment,
  fields,
  tipoEquipamentoId,
  tipoEquipamentoNome,
  getValue,
  updateField,
  onImageChange,
  getFileKey,
  getPendingBlobForField,
  onNext,
  onPrev,
  isLast,
}: ManualEquipmentStepProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const selectMutation = useMutation({
    mutationFn: async (equipamentoId: string) => {
      return api.selectEquipmentForSlot(documentId, { slotIndex, equipamentoId });
    },
    onSuccess: () => {
      setIsModalOpen(false);
      // Invalidate both the document query and force a refetch
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
      queryClient.refetchQueries({ queryKey: ['document', documentId] });
    },
  });

  // Generate a friendly slot name based on tipo or field labels
  const slotName = tipoEquipamentoNome || `Equipamento ${slotIndex + 1}`;

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {tipoEquipamentoNome && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                {tipoEquipamentoNome}
              </span>
            )}
            <span className="text-xs text-muted-foreground font-medium">
              {slotIndex + 1} de {totalSlots}
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-foreground leading-tight">
            {slotName}
          </h2>
          {!tipoEquipamentoNome && (
            <p className="text-muted-foreground text-xs font-medium mt-0.5">
              Todos os tipos de equipamento
            </p>
          )}
        </div>
        <Badge variant="outline" className="h-7 px-3 text-xs font-bold bg-muted/50 border-border">
          {slotIndex + 1}/{totalSlots}
        </Badge>
      </div>

      {!assignment ? (
        <div className="bg-white p-8 rounded-2xl border border-border shadow-sm flex flex-col items-center justify-center text-center gap-4 py-16">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <IconSearch size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">Selecionar Equipamento</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              {tipoEquipamentoId 
                ? `Escolha qual equipamento do tipo "${tipoEquipamentoNome}" irá preencher este slot.`
                : 'Escolha qual equipamento irá preencher este slot no documento.'}
            </p>
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="mt-2 font-bold px-8 rounded-full"
            disabled={selectMutation.isPending}
          >
            {selectMutation.isPending ? <Spinner className="mr-2" /> : <IconSearch className="mr-2 h-4 w-4" />}
            Buscar Equipamento
          </Button>
        </div>
      ) : (
        <>
          <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[10px] font-black uppercase text-primary tracking-wider">Equipamento Selecionado</p>
                {tipoEquipamentoNome && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-primary/20 text-primary">
                    {tipoEquipamentoNome}
                  </span>
                )}
              </div>
              <p className="font-bold text-foreground">{assignment.numeroEquipamento}</p>
              <p className="text-xs text-muted-foreground">{assignment.setorNome}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="rounded-full bg-white text-primary border-primary/20 hover:bg-primary/10"
              disabled={selectMutation.isPending}
            >
              {selectMutation.isPending ? <Spinner className="w-4 h-4" /> : <IconRefresh className="w-4 h-4 mr-2" />}
              Trocar
            </Button>
          </div>

          <div className="pt-2">
            <EquipmentStep
              assignment={assignment}
              index={slotIndex}
              total={totalSlots}
              fields={fields}
              getValue={getValue}
              updateField={updateField}
              onImageChange={onImageChange}
              getFileKey={getFileKey}
              getPendingBlobForField={getPendingBlobForField}
              onNext={onNext}
              onPrev={onPrev}
              isLast={isLast}
              hideHeader={true}
            />
          </div>
        </>
      )}

      {/* Navigation Buttons are handled inside EquipmentStep when rendered, but we need them when NO assignment */}
      {!assignment && (
        <div className="flex justify-between items-center pt-6 mt-6 border-t border-border">
          <Button
            variant="ghost"
            onClick={onPrev}
            className="font-bold text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <IconChevronLeft className="mr-2 h-4 w-4" /> Anterior
          </Button>
          <Button
            onClick={onNext}
            className="font-bold bg-primary text-white hover:bg-primary/90 rounded-full px-8"
          >
            {isLast ? 'Finalizar' : 'Próximo'} {isLast ? <IconCheck className="ml-2 h-4 w-4" /> : <IconChevronRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      )}

      <EquipmentSelectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tipoEquipamentoId={tipoEquipamentoId}
        onSelect={(id) => selectMutation.mutate(id)}
      />
    </div>
  );
}
