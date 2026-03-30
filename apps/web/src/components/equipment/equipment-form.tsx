'use client';

import { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import { Button, Input, Label } from '@regcheck/ui';
import type { LojaDTO, SetorDTO, TipoEquipamentoDTO, EquipamentoDTO } from '@regcheck/shared';
import { CameraScanner } from './camera-scanner';
import type { ScannerTarget, ScannerResult } from './camera-scanner';

// ─── IPv4 validation ──────────────────────────────────────────────────────────

function isValidIPv4(value: string): boolean {
  if (!value) return true; // opcional
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(value) &&
    value.split('.').every((n) => parseInt(n, 10) <= 255);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface EquipmentFormProps {
  initialData?: EquipamentoDTO & { modelo?: string; ip?: string };
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
    modelo?: string;
    ip?: string;
    glpiId?: string;
  }) => void;
  isLoading: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

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
  const [modelo, setModelo] = useState(initialData?.modelo ?? '');
  const [ip, setIp] = useState(initialData?.ip ?? '');
  const [glpiId, setGlpiId] = useState(initialData?.glpiId ?? '');
  const [scannerTarget, setScannerTarget] = useState<ScannerTarget | null>(null);
  const [ipError, setIpError] = useState('');

  useEffect(() => {
    if (initialData) {
      setLojaId(initialData.lojaId);
      setSetorId(initialData.setorId);
      setTipoId(initialData.tipoId);
      setNumeroEquipamento(initialData.numeroEquipamento);
      setSerie(initialData.serie ?? '');
      setPatrimonio(initialData.patrimonio ?? '');
      setModelo(initialData.modelo ?? '');
      setIp(initialData.ip ?? '');
      setGlpiId(initialData.glpiId ?? '');
    }
  }, [initialData]);

  const handleIpChange = (value: string) => {
    setIp(value);
    setIpError(value && !isValidIPv4(value) ? 'IPv4 inválido (ex: 192.168.1.1)' : '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lojaId || !setorId || !tipoId || !numeroEquipamento.trim()) return;
    if (ip && !isValidIPv4(ip)) return;

    onSubmit({
      lojaId,
      setorId,
      tipoId,
      numeroEquipamento: numeroEquipamento.trim(),
      serie: serie.trim() || undefined,
      patrimonio: patrimonio.trim() || undefined,
      modelo: modelo.trim() || undefined,
      ip: ip.trim() || undefined,
      glpiId: glpiId.trim() || undefined,
    });
  };

  const handleScanResult = (result: ScannerResult) => {
    if (result.serie) setSerie(result.serie);
    if (result.patrimonio) setPatrimonio(result.patrimonio);
    if (result.modelo) setModelo(result.modelo);
    setScannerTarget(null);
  };

  const isValid = lojaId && setorId && tipoId && numeroEquipamento.trim() && !ipError;

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

        <h3 className="text-sm font-medium">Dados de Identificação</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Série */}
          <div className="space-y-2">
            <Label>Série</Label>
            <div className="flex gap-2">
              <Input
                value={serie}
                onChange={(e) => setSerie(e.target.value)}
                placeholder="Número de série"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setScannerTarget('serie')}
                title="Ler série via câmera"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Patrimônio */}
          <div className="space-y-2">
            <Label>Patrimônio</Label>
            <div className="flex gap-2">
              <Input
                value={patrimonio}
                onChange={(e) => setPatrimonio(e.target.value)}
                placeholder="Número do patrimônio"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setScannerTarget('patrimonio')}
                title="Ler patrimônio via câmera"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Modelo */}
          <div className="space-y-2">
            <Label>Modelo (opcional)</Label>
            <div className="flex gap-2">
              <Input
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                placeholder="Modelo do equipamento"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setScannerTarget('modelo')}
                title="Capturar modelo via câmera"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* IP */}
          <div className="space-y-2">
            <Label>IP (opcional)</Label>
            <Input
              value={ip}
              onChange={(e) => handleIpChange(e.target.value)}
              placeholder="192.168.1.1"
            />
            {ipError && <p className="text-xs text-destructive">{ipError}</p>}
          </div>

          {/* GLPI */}
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

      {scannerTarget && (
        <CameraScanner
          onResult={handleScanResult}
          onClose={() => setScannerTarget(null)}
          targetField={scannerTarget}
        />
      )}
    </>
  );
}
