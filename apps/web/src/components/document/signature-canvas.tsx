'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@regcheck/ui';

interface SignatureCanvasProps {
  value: string;
  onChange: (dataUrl: string) => void;
  width?: number;
  height?: number;
}

/**
 * Canvas-based signature drawing component.
 * Captures mouse/touch input and outputs a PNG data URL.
 */
export function SignatureCanvas({
  value,
  onChange,
  width = 400,
  height = 150,
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  // Load existing value
  useEffect(() => {
    if (!value || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    if (value.startsWith('data:image')) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0);
        setHasContent(true);
      };
      img.src = value;
    }
  }, [value, width, height]);

  const getPosition = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      if (!touch) return { x: 0, y: 0 };
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }

    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      const pos = getPosition(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      setIsDrawing(true);
    },
    [getPosition],
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      const pos = getPosition(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      setHasContent(true);
    },
    [isDrawing, getPosition],
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL('image/png'));
  }, [onChange]);

  const clear = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    setHasContent(false);
    onChange('');
  }, [width, height, onChange]);

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border rounded cursor-crosshair bg-white touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={clear} disabled={!hasContent}>
          Limpar
        </Button>
        <span className="text-xs text-muted-foreground self-center">
          {hasContent ? 'Assinatura capturada' : 'Desenhe sua assinatura acima'}
        </span>
      </div>
    </div>
  );
}
