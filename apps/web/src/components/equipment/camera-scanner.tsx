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
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serieCandidates, setSerieCandidates] = useState<ScanCandidate[]>([]);
  const [patrimonioCandidates, setPatrimonioCandidates] = useState<ScanCandidate[]>([]);
  const [selectedSerie, setSelectedSerie] = useState('');
  const [selectedPatrimonio, setSelectedPatrimonio] = useState('');

  // Start camera
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
      if (isPermissionDenied) {
        setError(
          'Permissão de câmera negada. Toque no ícone de câmera/cadeado na barra do navegador e permita o acesso, depois tente novamente.'
        );
      } else {
        setError('Não foi possível acessar a câmera. Verifique se outro app está usando a câmera e tente novamente.');
      }
      console.error('[CameraScanner] Camera error:', err);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Capture frame and process
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

    try {
      const result = await EquipmentExtractorService.extract(canvas);
      setSerieCandidates(result.serie);
      setPatrimonioCandidates(result.patrimonio);

      // Auto-select best candidate
      if (result.serie.length > 0) {
        setSelectedSerie(result.serie[0].value);
      }
      if (result.patrimonio.length > 0) {
        setSelectedPatrimonio(result.patrimonio[0].value);
      }
    } catch (err) {
      setError('Erro ao processar imagem. Tente novamente.');
      console.error('[CameraScanner] Processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm selection
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      OCRService.terminate();
    };
  }, [stopCamera]);

  const hasCandidates = serieCandidates.length > 0 || patrimonioCandidates.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {targetField === 'patrimonio' ? 'Ler Patrimônio via Câmera' : targetField === 'serie' ? 'Ler Série via Câmera' : 'Leitura via Câmera'}
          </h2>
          <Button variant="outline" size="sm" onClick={() => { stopCamera(); onClose(); }}>
            Fechar
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Start camera button — shown before camera is started */}
          {!isStreaming && !error && (
            <Button onClick={startCamera} className="w-full">
              Iniciar Câmera
            </Button>
          )}

          {/* Camera preview — only shown when streaming */}
          {(isStreaming || error) && (
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Error message */}
          {error && (
            <div className="space-y-2">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={() => { setError(null); startCamera(); }}>
                Tentar novamente
              </Button>
            </div>
          )}

          {/* Capture button */}
          {isStreaming && (
            <div className="flex gap-3">
              <Button
                onClick={captureAndProcess}
                disabled={isProcessing}
                className="flex-1"
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
            </div>
          )}

          {/* Candidates */}
          {hasCandidates && (
            <div className="space-y-4">
              {/* Serie candidates — hidden when targeting only patrimonio */}
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

              {/* Patrimonio candidates — hidden when targeting only serie */}
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

              {/* Confirm */}
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
