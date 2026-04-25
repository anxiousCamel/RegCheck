export type {
  OCRCandidate,
  ScanCandidate,
  ScanResult,
  PipelineProgress,
  PipelineStage,
  PipelineTiming,
} from './types';

export { runScanPipeline, cancelScan, cleanupScanner, warmupScanner } from './scan-pipeline';

export { parseOCRText } from './ocr-parser';
export { deduplicateCandidates } from './dedupe';

export { AnalyticsService } from './services/analytics.service';
export { DeduplicationService } from './services/deduplication.service';
export { ResultCacheService } from './services/result-cache.service';
