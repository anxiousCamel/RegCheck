/**
 * Scan Pipeline Orchestrator.
 *
 * Pipeline: Capture → Hash → Cache → Dedup → Resize → Barcode → Preprocess (Worker) → OCR → Extract
 *
 * Every stage is cancellable, progress is reported, and no heavy work runs on the main thread.
 */

import type { ScanResult, ScanCandidate, PipelineProgress, PipelineTiming } from './types';
import { TaskController } from './core/task-controller';
import { ProcessingQueue } from './core/processing-queue';
import { retryBarcode, retryOCR } from './core/retry-strategy';
import { ImageHashService } from './services/image-hash.service';
import { ResultCacheService } from './services/result-cache.service';
import { DeduplicationService } from './services/deduplication.service';
import { ImageResizeService } from './services/image-resize.service';
import { BarcodeService } from './services/barcode.service';
import { ImageWorkerService } from './services/image-worker.service';
import { OCRService } from './services/ocr.service';
import { AdaptiveOCRService } from './services/adaptive-ocr.service';
import { AnalyticsService } from './services/analytics.service';

// ─── Stage labels ────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  capturing: 'Capturando imagem...',
  hashing: 'Verificando cache...',
  'cache-check': 'Resultado otimizado (cache)',
  'dedup-check': 'Leitura já realizada',
  resizing: 'Preparando imagem...',
  barcode: 'Detectando código de barras...',
  preprocessing: 'Processando imagem...',
  ocr: 'Lendo texto...',
  extracting: 'Extraindo dados...',
  done: 'Finalizado',
  error: 'Erro no processamento',
  cancelled: 'Cancelado',
};

function assertNotAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
}

// ─── Pipeline ────────────────────────────────────────────────────────────────

export type ProgressCallback = (progress: PipelineProgress) => void;

export interface ScanOptions {
  onProgress?: ProgressCallback;
  /** Se true, ignora cache e dedup — usado em recaptura explícita. */
  forceRefresh?: boolean;
}

function report(
  onProgress: ProgressCallback | undefined,
  stage: PipelineProgress['stage'],
  percent = 0,
): void {
  onProgress?.({ stage, percent, label: STAGE_LABELS[stage] ?? stage });
}

export async function runScanPipeline(
  image: ImageBitmap,
  options: ScanOptions = {},
): Promise<ScanResult> {
  const { onProgress, forceRefresh = false } = options;
  const { signal } = TaskController.createTask();
  const start = performance.now();
  const timing: PipelineTiming = { total: 0 };

  try {
    return await ProcessingQueue.enqueue(async () => {
      // ── Hash ──────────────────────────────────────────────────────────
      report(onProgress, 'hashing');
      const hashStart = performance.now();
      const hash = await ImageHashService.generate(image);
      timing.hash = performance.now() - hashStart;
      assertNotAborted(signal);

      // ── Cache check ───────────────────────────────────────────────────
      report(onProgress, 'cache-check');
      if (!forceRefresh) {
        const cached = await ResultCacheService.get(hash);
        if (cached) {
          AnalyticsService.track({
            type: 'cache_hit',
            stage: 'cache',
            duration: performance.now() - start,
          });
          timing.total = performance.now() - start;
          report(onProgress, 'done', 100);
          return { candidates: cached.candidates, fromCache: true, hash, timing };
        }
      }

      // ── Dedup check ───────────────────────────────────────────────────
      report(onProgress, 'dedup-check');
      if (!forceRefresh && DeduplicationService.isDuplicate(hash)) {
        const dupCandidates = DeduplicationService.get(hash) ?? [];
        AnalyticsService.track({
          type: 'dedup_hit',
          stage: 'dedup',
          duration: performance.now() - start,
        });
        timing.total = performance.now() - start;
        report(onProgress, 'done', 100);
        return { candidates: dupCandidates, fromCache: true, hash, timing };
      }

      // ── Resize ────────────────────────────────────────────────────────
      report(onProgress, 'resizing');
      const resizeStart = performance.now();
      const adaptiveDefaults = AdaptiveOCRService.getAdjustedDefaults();
      const { bitmap: resized, canvas: resizedCanvas } = await ImageResizeService.resize(
        image,
        adaptiveDefaults.maxWidth,
      );
      timing.resize = performance.now() - resizeStart;
      assertNotAborted(signal);

      // ── Barcode (priority) ────────────────────────────────────────────
      report(onProgress, 'barcode');
      const barcodeStart = performance.now();
      const barcodeCandidates = await retryBarcode(
        () => BarcodeService.detect(resized, signal),
        signal,
      );
      timing.barcode = performance.now() - barcodeStart;
      assertNotAborted(signal);

      if (barcodeCandidates.length > 0) {
        await persistResult(hash, barcodeCandidates, 'barcode', start, timing);
        report(onProgress, 'done', 100);
        return { candidates: barcodeCandidates, fromCache: false, hash, timing };
      }

      // ── Preprocess in Worker ──────────────────────────────────────────
      report(onProgress, 'preprocessing');
      const preprocessStart = performance.now();
      const ctx = resizedCanvas.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, resizedCanvas.width, resizedCanvas.height);

      const ocrCandidates = await retryOCR(
        async (attempt) => {
          assertNotAborted(signal);
          const params = AdaptiveOCRService.getParams(attempt);

          // Clone imageData for each attempt (original was transferred on first call)
          let data: ImageData;
          if (attempt === 0) {
            data = await ImageWorkerService.process(imageData, params, signal);
          } else {
            // Re-read from canvas for retries
            const freshData = ctx.getImageData(0, 0, resizedCanvas.width, resizedCanvas.height);
            data = await ImageWorkerService.process(freshData, params, signal);
          }
          timing.preprocess = performance.now() - preprocessStart;

          // ── OCR ───────────────────────────────────────────────────────
          report(onProgress, 'ocr');
          const ocrStart = performance.now();

          // Create canvas from processed ImageData for OCR
          const ocrCanvas = new OffscreenCanvas(data.width, data.height);
          ocrCanvas.getContext('2d')!.putImageData(data, 0, 0);

          // OCRService agora retorna OCRCandidate[] — sem auto-seleção
          const ocrCandidateList = await OCRService.recognize(
            ocrCanvas,
            (pct) => report(onProgress, 'ocr', pct),
            signal,
          );
          timing.ocr = performance.now() - ocrStart;

          // ── Extract ───────────────────────────────────────────────────
          report(onProgress, 'extracting');
          const extractStart = performance.now();

          // Mapeia OCRCandidate → ScanCandidate para compatibilidade interna
          const candidates: import('./types').ScanCandidate[] = ocrCandidateList.map((c) => ({
            type: c.type === 'patrimonio' ? 'asset' : c.type === 'serial' ? 'serial' : 'serial',
            value: c.value,
            confidence: c.confidence,
            source: 'ocr' as const,
          }));
          timing.extract = performance.now() - extractStart;

          if (candidates.length === 0) {
            throw new Error('No candidates extracted');
          }

          return candidates;
        },
        () => {
          report(onProgress, 'preprocessing');
          AdaptiveOCRService.recordFailure();
        },
        signal,
      );

      assertNotAborted(signal);
      AdaptiveOCRService.recordSuccess();
      await persistResult(hash, ocrCandidates, 'ocr', start, timing);
      report(onProgress, 'done', 100);
      return { candidates: ocrCandidates, fromCache: false, hash, timing };

    }, 10); // High priority for user-initiated scans
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      report(onProgress, 'cancelled');
      AnalyticsService.track({
        type: 'failure',
        stage: 'cancelled',
        duration: performance.now() - start,
      });
    } else {
      report(onProgress, 'error');
      AnalyticsService.track({
        type: 'failure',
        stage: 'unknown',
        duration: performance.now() - start,
        metadata: { error: String(err) },
      });
    }
    throw err;
  }
}

async function persistResult(
  hash: string,
  candidates: ScanCandidate[],
  method: string,
  startTime: number,
  timing: PipelineTiming,
): Promise<void> {
  timing.total = performance.now() - startTime;
  await ResultCacheService.set(hash, candidates);
  DeduplicationService.add(hash, candidates);
  AnalyticsService.track({
    type: 'success',
    stage: 'complete',
    duration: timing.total,
    metadata: { method },
  });
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

export function cancelScan(): void {
  TaskController.cancelAll();
  ProcessingQueue.clear();
}

export function cleanupScanner(): void {
  cancelScan();
  OCRService.terminate();
  ImageWorkerService.terminate();
}

/** Warm up OCR engine (call on component mount). */
export function warmupScanner(): void {
  OCRService.warmup().catch(() => {});
}
