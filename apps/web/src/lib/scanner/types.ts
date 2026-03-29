/** Pipeline types for the equipment label scanner. */

// ─── Candidate & Result ──────────────────────────────────────────────────────

export type CandidateType = 'serial' | 'asset';
export type CandidateSource = 'barcode' | 'ocr';

export interface ScanCandidate {
  type: CandidateType;
  value: string;
  confidence: number;
  source: CandidateSource;
}

export interface ScanResult {
  candidates: ScanCandidate[];
  fromCache: boolean;
  hash: string;
  timing: PipelineTiming;
}

// ─── Pipeline ────────────────────────────────────────────────────────────────

export type PipelineStage =
  | 'capturing'
  | 'hashing'
  | 'cache-check'
  | 'dedup-check'
  | 'resizing'
  | 'barcode'
  | 'preprocessing'
  | 'ocr'
  | 'extracting'
  | 'done'
  | 'error'
  | 'cancelled';

export interface PipelineTiming {
  total: number;
  capture?: number;
  hash?: number;
  resize?: number;
  barcode?: number;
  preprocess?: number;
  ocr?: number;
  extract?: number;
}

export interface PipelineProgress {
  stage: PipelineStage;
  /** 0–100 progress within current stage (mainly for OCR) */
  percent: number;
  label: string;
}

// ─── Cache ───────────────────────────────────────────────────────────────────

export interface CachedResult {
  candidates: ScanCandidate[];
  hash: string;
  createdAt: number;
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface AnalyticsEvent {
  type: 'success' | 'failure' | 'retry' | 'cache_hit' | 'dedup_hit';
  stage: string;
  duration: number;
  metadata?: Record<string, unknown>;
}

// ─── Worker messages ─────────────────────────────────────────────────────────

export interface PreprocessRequest {
  type: 'preprocess';
  imageData: { data: Uint8ClampedArray; width: number; height: number };
  params: PreprocessParams;
}

export interface PreprocessResponse {
  type: 'preprocess-result';
  imageData: { data: Uint8ClampedArray; width: number; height: number };
}

export interface PreprocessParams {
  threshold?: number;
  contrast?: number;
}

// ─── Adaptive OCR ────────────────────────────────────────────────────────────

export interface AdaptiveParams {
  threshold: number;
  contrast: number;
  maxWidth: number;
}

// ─── Queue ───────────────────────────────────────────────────────────────────

export interface QueuedTask<T = unknown> {
  id: string;
  priority: number;
  execute: (signal: AbortSignal) => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}
