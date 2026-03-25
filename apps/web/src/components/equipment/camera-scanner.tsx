'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button, Spinner } from '@regcheck/ui';
import type { ScanCandidate } from '@regcheck/shared';
import { EquipmentExtractorService } from '@/lib/scanner/equipment-extractor-service';
import { OCRService } from '@/lib/scanner/ocr-service';

interface CameraScannerProps {
  onResult: (result: { serie?: string; patrimonio?: string }) => void;
  onClose: () => void;
  targetField?: 'serie' | 'patrimonio';
}

export function CameraScanner({ onResult, onClose, targetField }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serieCandidates, setSerieCandidates] = useState<ScanCandidate[]>([]);
  const [patrimonioCandidates, setPatrimonioCandidates] = useState<ScanCandidate[]>([]);
  const [selectedSerie, setSelectedSerie] = useState('');
  const [selectedPatrimonio, setSelectedPatrimonio] = useState('');

  // HTTP (non-secure context) blocks getUserMedia on mobile — use file input fallback
  const useFileInputFallback =
    typeof window !== 'undefined' && !window.isSecureContext;

  // --- Secure context: video stream mode ---

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err) {
      const isPermissionDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      setError(
        isPermissionDenied
          ? 'Permissão de câmera negada. Verifique as permissões do navegador e tente novamente.'
          : 'Não foi possível acessar a câmera.'
      );
      console.error('[CameraScanner] Camera error:', err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const captureAndProcess = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    setError(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);

    await processCanvas(canvas);
  };

  // --- File input fallback (HTTP / non-secure context) ---

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canvasRef.current) return;

    setIsProcessing(true);
    setError(null);

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      const canvas = canvasRef.current!;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      await processCanvas(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError('Não foi possível carregar a imagem. Tente novamente.');
      setIsProcessing(false);
    };
    img.src = url;

    // Reset input so the same file can be re-selected if needed
    e.target.value = '';
  };

  // --- Shared processing ---

  const processCanvas = async (canvas: HTMLCanvasElement) => {
    try {
      const result = await EquipmentExtractorService.extract(canvas);
      setSerieCandidates(result.serie);
      setPatrimonioCandidates(result.patrimonio);

      if (result.serie.length > 0) setSelectedSerie(result.serie[0].value);
      if (result.patrimonio.length > 0) setSelectedPatrimonio(result.patrimonio[0].value);
    } catch (err) {
      setError('Erro ao processar imagem. Tente novamente.');
      console.error('[CameraScanner] Processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (targetField === 'serie') {
      onResult({ serie: selectedSerie || undefined });
    } else if (targetField === 'patrimonio') {
      onResult({ patrimonio: selectedPatrimonio || undefined });
    } else {
      onResult({
        serie: selectedSerie || undefined,
        patrimonio: selectedPatrimonio || undefined,
      });
    }
  };

  // Auto-start camera on secure context
  useEffect(() => {
    if (!useFileInputFallback) {
      startCamera();
    }
    return () => {
      stopCamera();
      OCRService.terminate();
    };
  }, [useFileInputFallback, startCamera, stopCamera]);

  const hasCandidates = serieCandidates.length > 0 || patrimonioCandidates.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {targetField === 'patrimonio'
              ? 'Ler Patrimônio via Câmera'
              : targetField === 'serie'
              ? 'Ler Série via Câmera'
              : 'Leitura via Câmera'}
          </h2>
          <Button variant="outline" size="sm" onClick={() => { stopCamera(); onClose(); }}>
            Fechar
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {useFileInputFallback ? (
            /* HTTP fallback: open native camera via file input */
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
                onChange={handleFileChange}
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
                ) : (
                  'Abrir Câmera'
                )}
              </Button>
            </div>
          ) : (
            /* Secure context: live video stream */
            <>
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!isStreaming && !error && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Spinner />
                  </div>
                )}
              </div>

              {isStreaming && (
                <Button
                  onClick={captureAndProcess}
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Processando...
                    </>
                  ) : (
                    'Capturar'
                  )}
                </Button>
              )}
            </>
          )}

          {/* Hidden canvas for image processing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Candidates */}
          {hasCandidates && (
            <div className="space-y-4">
              {targetField !== 'patrimonio' && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Série (candidatos)</h3>
                  {serieCandidates.length > 0 ? (
                    <div className="space-y-1">
                      {serieCandidates.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedSerie(c.value)}
                          className={`w-full text-left px-3 py-2 rounded-md border text-sm flex items-center justify-between transition-colors ${
                            selectedSerie === c.value
                              ? 'border-primary bg-primary/10'
                              : 'border-input hover:bg-muted/50'
                          }`}
                        >
                          <span className="font-mono">{c.value}</span>
                          <span className="text-xs text-muted-foreground">
                            {c.source === 'barcode' ? 'Barcode' : 'OCR'} ({Math.round(c.confidence * 100)}%)
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Nenhum candidato encontrado</p>
                  )}
                  <input
                    type="text"
                    value={selectedSerie}
                    onChange={(e) => setSelectedSerie(e.target.value)}
                    placeholder="Editar manualmente..."
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  />
                </div>
              )}

              {targetField !== 'serie' && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Patrimônio (candidatos)</h3>
                  {patrimonioCandidates.length > 0 ? (
                    <div className="space-y-1">
                      {patrimonioCandidates.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedPatrimonio(c.value)}
                          className={`w-full text-left px-3 py-2 rounded-md border text-sm flex items-center justify-between transition-colors ${
                            selectedPatrimonio === c.value
                              ? 'border-primary bg-primary/10'
                              : 'border-input hover:bg-muted/50'
                          }`}
                        >
                          <span className="font-mono">{c.value}</span>
                          <span className="text-xs text-muted-foreground">
                            {c.source === 'barcode' ? 'Barcode' : 'OCR'} ({Math.round(c.confidence * 100)}%)
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Nenhum candidato encontrado</p>
                  )}
                  <input
                    type="text"
                    value={selectedPatrimonio}
                    onChange={(e) => setSelectedPatrimonio(e.target.value)}
                    placeholder="Editar manualmente..."
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={handleConfirm} className="flex-1">
                  Confirmar e Usar
                </Button>
                <Button variant="outline" onClick={() => {
                  setSerieCandidates([]);
                  setPatrimonioCandidates([]);
                  setSelectedSerie('');
                  setSelectedPatrimonio('');
                }}>
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
