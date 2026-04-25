import * as React from 'react';
import { cn } from '@regcheck/ui';

interface ProgressBarProps {
  value: number;
  max?: number;
  height?: number;
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  height = 6,
  showLabel = false,
  label,
  className,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className={cn('flex items-center gap-2 w-full', className)}>
      <div className="flex-1 bg-muted rounded-full overflow-hidden" style={{ height }}>
        <div
          className="h-full bg-primary rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <div className="text-xs text-muted-foreground font-semibold tabular-nums">
          {label ?? `${Math.round(pct)}%`}
        </div>
      )}
    </div>
  );
}

interface SectionLabelProps {
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export function SectionLabel({ children, right, className }: SectionLabelProps) {
  return (
    <div className={cn('flex items-center justify-between px-1 mb-2', className)}>
      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em]">
        {children}
      </div>
      {right}
    </div>
  );
}

interface YesNoProps {
  value: boolean | null;
  onChange: (value: boolean) => void;
  className?: string;
}

export function YesNo({ value, onChange, className }: YesNoProps) {
  return (
    <div
      className={cn('flex p-[3px] rounded-[10px] bg-muted border border-border w-40', className)}
    >
      {[
        { v: true, label: 'Sim' },
        { v: false, label: 'Não' },
      ].map((opt) => {
        const active = value === opt.v;
        return (
          <button
            key={String(opt.v)}
            type="button"
            onClick={() => onChange(opt.v)}
            className={cn(
              'flex-1 h-9 rounded-lg border-none font-bold text-sm transition-all duration-150 ease-in-out cursor-pointer',
              active
                ? 'bg-white shadow-sm ' + (opt.v ? 'text-green-600' : 'text-red-600')
                : 'bg-transparent text-muted-foreground',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
