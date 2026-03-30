'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button, Spinner } from '@regcheck/ui';
import {
  runScanPipeline,
  cancelScan,
  cleanupScanner,
  warmupScanner,
} from '@/lib/scanner';
import type { ScanCandidate, PipelineProgress } from '@/lib/scanner';

// ─── Props ───────────────────────────────────────────────────────────────────

interface CameraScannerProps {
  onResult: (result: { serie?: string; patrimonio?: string }) => void;
  onClose: () => void;
  targetField?: 'serie' | 'patrimonio';
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CameraScanner({ onResult, onClose, targetField }: CameraScannerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<ScanCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Warm up OCR engine on mount
  useEffect(() => {
    warmupScanner();
    return () => {
      cleanupScanner();
    };
  }, []);

  // ─── Capture + Pipeline ──────────────────────────────────────────────────

  const handleCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsProcessing(true);
    setError(null);
    setCandidates([]);
    setSelected(new Set());

    try {
      const bitmap = await createImageBitmap(file);
      const result = await runScanPipeline(bitmap, {
        onProgress: setProgress,
      });

      if (result.candidates.length > 0) {
        setCandidates(result.candidates);
        // Auto-select the best candidate of each type
        const autoSelected = new Set<string>();
        const bestSerial = result.candidates.find((c) => c.type === 'serial');
        const bestAsset = result.candidates.find((c) => c.type === 'asset');
        if (bestSerial) autoSelected.add(bestSerial.value);
        if (bestAsset) autoSelected.add(bestAsset.value);
        setSelected(autoSelected);
      } else {
        setError('Nenhum dado encontrado. Tente novamente com melhor iluminação.');
      }

      if (result.fromCache) {
        setProgress({ stage: 'done', percent: 100, label: 'Resultado otimizado (cache)' });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError('Erro ao processar imagem. Tente novamente.');
      console.error('[CameraScanner] Pipeline error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // ─── Selection toggle ────────────────────────────────────────────────────

  const toggleCandidate = (value: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  // ─── Confirm ─────────────────────────────────────────────────────────────

  const handleConfirm = () => {
    const selectedCandidates = candidates.filter((c) => selected.has(c.value));
    const serie = selectedCandidates.find((c) => c.type === 'serial')?.value;
    const patrimonio = selectedCandidates.find((c) => c.type === 'asset')?.value;

    if (targetField === 'serie') {
      onResult({ serie });
    } else if (targetField === 'patrimonio') {
      onResult({ patrimonio });
    } else {
      onResult({ serie, patrimonio });
    }
  };

  // ─── Reset ───────────────────────────────────────────────────────────────

  const handleNewCapture = () => {
    cancelScan();
    setCandidates([]);
    setSelected(new Set());
    setError(null);
    setProgress(null);
    fileInputRef.current?.click();
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  const serialCandidates = candidates.filter((c) => c.type === 'serial');
  const assetCandidates = candidates.filter((c) => c.type === 'asset');
  const hasCandidates = candidates.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {targetField === 'patrimonio'
              ? 'Ler Patrimônio via Câmera'
              : targetField === 'serie'
              ? 'Ler Série via Câmera'
              : 'Leitura via Câmera'}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { cancelScan(); onClose(); }}
          >
            Fechar
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Camera input */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Tire uma foto da etiqueta do equipamento para extrair os dados automaticamente.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleCapture}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Processando...
                </>
              ) : hasCandidates ? (
                'Nova Captura'
              ) : (
                'Abrir Câmera'
              )}
            </Button>
          </div>

          {/* Progress bar */}
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

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Candidates with checkboxes */}
          {hasCandidates && (
            <div className="space-y-4">
              {/* Serial candidates */}
              {targetField !== 'patrimonio' && serialCandidates.length > 0 && (
                <CandidateGroup
                  title="Série"
                  candidates={serialCandidates}
                  selected={selected}
                  onToggle={toggleCandidate}
                />
              )}

              {/* Asset (patrimônio) candidates */}
              {targetField !== 'serie' && assetCandidates.length > 0 && (
                <CandidateGroup
                  title="Patrimônio"
                  candidates={assetCandidates}
                  selected={selected}
                  onToggle={toggleCandidate}
                />
              )}

              {/* No candidates for target type */}
              {targetField === 'serie' && serialCandidates.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum candidato de série encontrado</p>
              )}
              {targetField === 'patrimonio' && assetCandidates.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum candidato de patrimônio encontrado</p>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={handleConfirm}
                  className="flex-1"
                  disabled={selected.size === 0}
                >
                  Confirmar Seleção
                </Button>
                <Button variant="outline" onClick={handleNewCapture}>
                  Nova Captura
                </Button>
              </div>
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
  onToggle,
}: {
  title: string;
  candidates: ScanCandidate[];
  selected: Set<string>;
  onToggle: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="space-y-1">
        {candidates.map((c, i) => (
          <button
            key={i}
            onClick={() => onToggle(c.value)}
            className={`w-full text-left px-3 py-2 rounded-md border text-sm flex items-center gap-3 transition-colors ${
              selected.has(c.value)
                ? 'border-primary bg-primary/10'
                : 'border-input hover:bg-muted/50'
            }`}
          >
            <div
              className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                selected.has(c.value)
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'border-input'
              }`}
            >
              {selected.has(c.value) && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span className="font-mono flex-1">{c.value}</span>
            <span className="text-xs text-muted-foreground">
              {c.source === 'barcode' ? 'Barcode' : 'OCR'} ({Math.round(c.confidence * 100)}%)
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
