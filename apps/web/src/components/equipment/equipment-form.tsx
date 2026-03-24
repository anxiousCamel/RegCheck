'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Label } from '@regcheck/ui';
import type { LojaDTO, SetorDTO, TipoEquipamentoDTO, EquipamentoDTO } from '@regcheck/shared';
import { CameraScanner } from './camera-scanner';

interface EquipmentFormProps {
  initialData?: EquipamentoDTO;
  lojas: LojaDTO[];
  setores: SetorDTO[];
  tipos: TipoEquipamentoDTO[];
  onSubmit: (data: {
    lojaId: string;
    setorId: string;
    tipoId: string;
    numeroEquipamento: string;
    serie?: string;
    patrimonio?: string;
    glpiId?: string;
  }) => void;
  isLoading: boolean;
}

export function EquipmentForm({
  initialData,
  lojas,
  setores,
  tipos,
  onSubmit,
  isLoading,
}: EquipmentFormProps) {
  const [lojaId, setLojaId] = useState(initialData?.lojaId ?? '');
  const [setorId, setSetorId] = useState(initialData?.setorId ?? '');
  const [tipoId, setTipoId] = useState(initialData?.tipoId ?? '');
  const [numeroEquipamento, setNumeroEquipamento] = useState(initialData?.numeroEquipamento ?? '');
  const [serie, setSerie] = useState(initialData?.serie ?? '');
  const [patrimonio, setPatrimonio] = useState(initialData?.patrimonio ?? '');
  const [glpiId, setGlpiId] = useState(initialData?.glpiId ?? '');
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (initialData) {
      setLojaId(initialData.lojaId);
      setSetorId(initialData.setorId);
      setTipoId(initialData.tipoId);
      setNumeroEquipamento(initialData.numeroEquipamento);
      setSerie(initialData.serie ?? '');
      setPatrimonio(initialData.patrimonio ?? '');
      setGlpiId(initialData.glpiId ?? '');
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lojaId || !setorId || !tipoId || !numeroEquipamento.trim()) return;

    onSubmit({
      lojaId,
      setorId,
      tipoId,
      numeroEquipamento: numeroEquipamento.trim(),
      serie: serie.trim() || undefined,
      patrimonio: patrimonio.trim() || undefined,
      glpiId: glpiId.trim() || undefined,
    });
  };

  const handleScanResult = (result: { serie?: string; patrimonio?: string }) => {
    if (result.serie) setSerie(result.serie);
    if (result.patrimonio) setPatrimonio(result.patrimonio);
    setShowScanner(false);
  };

  const isValid = lojaId && setorId && tipoId && numeroEquipamento.trim();

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Loja *</Label>
            <select
              value={lojaId}
              onChange={(e) => setLojaId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">Selecione...</option>
              {lojas.map((l) => (
                <option key={l.id} value={l.id}>{l.nome}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Setor *</Label>
            <select
              value={setorId}
              onChange={(e) => setSetorId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">Selecione...</option>
              {setores.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Tipo *</Label>
            <select
              value={tipoId}
              onChange={(e) => setTipoId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">Selecione...</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Nº Equipamento *</Label>
            <Input
              value={numeroEquipamento}
              onChange={(e) => setNumeroEquipamento(e.target.value)}
              placeholder="Número do equipamento"
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium">Dados de Identificação</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowScanner(true)}>
            Ler via Câmera
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Série</Label>
            <Input
              value={serie}
              onChange={(e) => setSerie(e.target.value)}
              placeholder="Número de série"
            />
          </div>

          <div className="space-y-2">
            <Label>Patrimônio</Label>
            <Input
              value={patrimonio}
              onChange={(e) => setPatrimonio(e.target.value)}
              placeholder="Número do patrimônio"
            />
          </div>

          <div className="space-y-2">
            <Label>GLPI ID (opcional)</Label>
            <Input
              value={glpiId}
              onChange={(e) => setGlpiId(e.target.value)}
              placeholder="ID no GLPI"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={!isValid || isLoading}>
            {isLoading ? 'Salvando...' : initialData ? 'Atualizar' : 'Cadastrar'}
          </Button>
        </div>
      </form>

      {showScanner && (
        <CameraScanner
          onResult={handleScanResult}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
}
