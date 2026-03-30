'use client';

/**
 * Hook de controle OCR.
 * Gerencia estado + AbortController.
 * Garante que recaptura sempre limpa estado anterior.
 * Nunca auto-seleciona — usuário sempre decide.
 */

import { useState, useRef, useCallback } from 'react';
import type { OCRCandidate, PipelineProgress } from '@/lib/scanner/types';
import { runScanPipeline } from '@/lib/scanner/scan-pipeline';
import { cancelScan } from '@/lib/scanner/scan-pipeline';

export type OcrStatus = 'idle' | 'processing' | 'done' | 'error' | 'cancelled';

export interface OcrState {
  status: OcrStatus;
  candidates: OCRCandidate[];
  progress: PipelineProgress | null;
  error: string | null;
}

export interface UseOcrReturn extends OcrState {
  process: (image: ImageBitmap) => Promise<void>;
  recapture: () => void;
  reset: () => void;
  logUserChoice: (candidate: OCRCandidate) => void;
}

const INITIAL_STATE: OcrState = {
  status: 'idle',
  candidates: [],
  progress: null,
  error: null,
};

export function useOcr(): UseOcrReturn {
  const [state, setState] = useState<OcrState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  /** Cancela processamento anterior e limpa estado. */
  const abortPrevious = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    cancelScan();
  }, []);

  const reset = useCallback(() => {
    abortPrevious();
    setState(INITIAL_STATE);
  }, [abortPrevious]);

  /** Processa imagem. Estado sempre limpo antes de iniciar. */
  const process = useCallback(async (image: ImageBitmap) => {
    abortPrevious();

    const controller = new AbortController();
    abortRef.current = controller;

    // Estado limpo — sem resíduo de captura anterior
    setState({ status: 'processing', candidates: [], progress: null, error: null });

    try {
      const result = await runScanPipeline(image, {
        onProgress: (p) => setState((prev) => ({ ...prev, progress: p })),
      });

      if (controller.signal.aborted) return;

      // Mapeia ScanCandidate → OCRCandidate (normaliza tipo)
      const candidates: OCRCandidate[] = result.candidates.map((c) => ({
        value: c.value,
        confidence: c.confidence,
        type: c.type === 'asset' ? 'patrimonio' : c.type === 'serial' ? 'serial' : 'unknown',
      }));

      console.debug('[useOcr] candidatos disponíveis para o usuário:', candidates);

      setState({ status: 'done', candidates, progress: null, error: null });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setState((prev) => ({ ...prev, status: 'cancelled', progress: null }));
        return;
      }
      const msg = err instanceof Error ? err.message : 'Erro ao processar imagem';
      setState({ status: 'error', candidates: [], progress: null, error: msg });
    }
  }, [abortPrevious]);

  /** Recaptura: aborta anterior, limpa estado. Quem chama deve fornecer nova imagem. */
  const recapture = useCallback(() => {
    abortPrevious();
    setState(INITIAL_STATE);
  }, [abortPrevious]);

  /** Loga escolha do usuário para analytics/debug. */
  const logUserChoice = useCallback((candidate: OCRCandidate) => {
    console.info('[useOcr] escolha do usuário:', candidate);
  }, []);

  return { ...state, process, recapture, reset, logUserChoice };
}
