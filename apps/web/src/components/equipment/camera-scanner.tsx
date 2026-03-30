'use client';

import { useRef, useCallback } from 'react';
import { Button, Input, Spinner } from '@regcheck/ui';
import { useOcr } from '@/hooks/use-ocr';
import type { OCRCandidate } from '@/lib/scanner/types';
import { warmupScanner, cleanupScanner } from '@/lib/scanner';
import { useEffect, useState } from 'react';

// ─── Props ───────────────────────────────────────────────────────────────────

export type ScannerTarget = 'serie' | 'patrimonio' | 'modelo' | 'all';

export interface ScannerResult {
  serie?: string;
  patrimonio?: string;
  modelo?: string;
}

interface CameraScannerProps {
  onResult: (result: ScannerResult) => void;
  onClose: () => void;
  targetField?: ScannerTarget;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CameraScanner({ onResult, onClose, targetField = 'all' }: CameraScannerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { status, candidates, progress, error, process, recapture, logUserChoice } = useOcr();

  // Seleção única por tipo — usuário escolhe, nunca auto-selecionado
  const [selectedSerie, setSelectedSerie] = useState<string>('');
  const [selectedPatrimonio, setSelectedPatrimonio] = useState<string>('');
  const [selectedModelo, setSelectedModelo] = useState<string>('');

  // Campos manuais (fallback)
  const [manualSerie, setManualSerie] = useState('');
  const [manualPatrimonio, setManualPatrimonio] = useState('');
  const [manualModelo, setManualModelo] = useState('');

  useEffect(() => {
    warmupScanner();
    return () => { cleanupScanner(); };
  }, []);

  // Limpa seleções ao receber novos candidatos
  useEffect(() => {
    if (status === 'done') {
      setSelectedSerie('');
      setSelectedPatrimonio('');
      setSelectedModelo('');
    }
  }, [status, candidates]);

  // ─── Captura ─────────────────────────────────────────────────────────────

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const bitmap = await createImageBitmap(file);
    await process(bitmap);
  }, [process]);

  const handleNewCapture = useCallback(() => {
    recapture();
    setSelectedSerie('');
    setSelectedPatrimonio('');
    setSelectedModelo('');
    fileInputRef.current?.click();
  }, [recapture]);

  const openCamera = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // ─── Seleção de candidato ─────────────────────────────────────────────────

  const selectCandidate = (c: OCRCandidate) => {
    logUserChoice(c);
    if (c.type === 'serial') setSelectedSerie(c.value);
    else if (c.type === 'patrimonio') setSelectedPatrimonio(c.value);
    else if (c.type === 'modelo') setSelectedModelo(c.value);
  };

  // ─── Confirmar ────────────────────────────────────────────────────────────

  const handleConfirm = () => {
    const serie = selectedSerie || manualSerie.trim() || undefined;
    const patrimonio = selectedPatrimonio || manualPatrimonio.trim() || undefined;
    const modelo = selectedModelo || manualModelo.trim() || undefined;

    if (targetField === 'serie') onResult({ serie });
    else if (targetField === 'patrimonio') onResult({ patrimonio });
    else if (targetField === 'modelo') onResult({ modelo });
    else onResult({ serie, patrimonio, modelo });
  };

  // ─── Candidatos filtrados por target ─────────────────────────────────────

  const showSerie = targetField === 'serie' || targetField === 'all';
  const showPatrimonio = targetField === 'patrimonio' || targetField === 'all';
  const showModelo = targetField === 'modelo' || targetField === 'all';

  const serialCandidates = candidates.filter((c) => c.type === 'serial');
  const patrimonioCandidates = candidates.filter((c) => c.type === 'patrimonio');
  const modeloCandidates = candidates.filter((c) => c.type === 'modelo');

  const isProcessing = status === 'processing';
  const hasCandidates = candidates.length > 0;

  const hasSelection =
    selectedSerie || selectedPatrimonio || selectedModelo ||
    manualSerie.trim() || manualPatrimonio.trim() || manualModelo.trim();

  const titleMap: Record<ScannerTarget, string> = {
    serie: 'Ler Série via Câmera',
    patrimonio: 'Ler Patrimônio via Câmera',
    modelo: 'Ler Modelo via Câmera',
    all: 'Leitura via Câmera',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">{titleMap[targetField]}</h2>
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Tire uma foto da etiqueta. Os candidatos encontrados serão listados — você escolhe qual usar.
          </p>

          {/* Input câmera */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          <Button
            onClick={hasCandidates ? handleNewCapture : openCamera}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <><Spinner className="mr-2 h-4 w-4" />Processando...</>
            ) : hasCandidates ? (
              'Nova Captura'
            ) : (
              'Abrir Câmera'
            )}
          </Button>

          {/* Progress */}
          {isProcessing && progress && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{progress.label}</span>
                {progress.percent > 0 && <span>{Math.round(progress.percent)}%</span>}
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(progress.percent, 5)}%` }}
                />
              </div>
            </div>
          )}

          {/* Erro */}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {status === 'done' && !hasCandidates && (
            <p className="text-sm text-muted-foreground">
              Nenhum dado encontrado. Use os campos manuais abaixo ou tente nova captura.
            </p>
          )}

          {/* Candidatos — usuário escolhe */}
          {hasCandidates && (
            <div className="space-y-4">
              {showSerie && serialCandidates.length > 0 && (
                <CandidateGroup
                  title="Série — selecione uma opção"
                  candidates={serialCandidates}
                  selected={selectedSerie}
                  onSelect={selectCandidate}
                />
              )}
              {showPatrimonio && patrimonioCandidates.length > 0 && (
                <CandidateGroup
                  title="Patrimônio — selecione uma opção"
                  candidates={patrimonioCandidates}
                  selected={selectedPatrimonio}
                  onSelect={selectCandidate}
                />
              )}
              {showModelo && modeloCandidates.length > 0 && (
                <CandidateGroup
                  title="Modelo — selecione uma opção"
                  candidates={modeloCandidates}
                  selected={selectedModelo}
                  onSelect={selectCandidate}
                />
              )}
            </div>
          )}

          {/* Campos manuais (fallback sempre visível após tentativa) */}
          {(hasCandidates || status === 'done' || status === 'error') && (
            <div className="space-y-3 border-t pt-4">
              <p className="text-xs text-muted-foreground font-medium">
                Ou preencha manualmente:
              </p>
              {showSerie && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Série (manual)</label>
                  <Input
                    value={manualSerie}
                    onChange={(e) => setManualSerie(e.target.value)}
                    placeholder="Digite o número de série"
                  />
                </div>
              )}
              {showPatrimonio && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Patrimônio (manual)</label>
                  <Input
                    value={manualPatrimonio}
                    onChange={(e) => setManualPatrimonio(e.target.value)}
                    placeholder="Digite o número do patrimônio"
                  />
                </div>
              )}
              {showModelo && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Modelo (manual)</label>
                  <Input
                    value={manualModelo}
                    onChange={(e) => setManualModelo(e.target.value)}
                    placeholder="Digite o modelo"
                  />
                </div>
              )}
            </div>
          )}

          {/* Ações */}
          {(hasCandidates || status === 'done' || status === 'error') && (
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleConfirm}
                className="flex-1"
                disabled={!hasSelection}
              >
                Confirmar
              </Button>
              <Button variant="outline" onClick={handleNewCapture}>
                Nova Captura
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Candidate Group ─────────────────────────────────────────────────────────

function CandidateGroup({
  title,
  candidates,
  selected,
  onSelect,
}: {
  title: string;
  candidates: OCRCandidate[];
  selected: string;
  onSelect: (c: OCRCandidate) => void;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="space-y-1">
        {candidates.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(c)}
            className={`w-full text-left px-3 py-2 rounded-md border text-sm flex items-center gap-3 transition-colors ${
              selected === c.value
                ? 'border-primary bg-primary/10'
                : 'border-input hover:bg-muted/50'
            }`}
          >
            {/* Radio visual */}
            <div
              className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                selected === c.value ? 'border-primary bg-primary' : 'border-input'
              }`}
            />
            <span className="font-mono flex-1">{c.value}</span>
            <span className="text-xs text-muted-foreground">
              {Math.round(c.confidence * 100)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
