import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { FILL, type ChartTone } from './chartTones';

export interface ProgressMeterProps {
  label: string;
  /** 0 to 100: how much of the track is filled. Null draws an empty track. */
  percent: number | null;
  /** The figure in words, always visible: «115 de 118 secciones regadas». */
  valueText: string;
  /** Visible headline next to the label, e.g. «97,5 %». */
  headline?: ReactNode;
  tone?: ChartTone;
  footnote?: ReactNode;
}

/**
 * A value against its total or its target (SPEC-202 §2.2). The fill width is
 * the only dynamic style (SPEC-C01 §10.1); the figure is always written next to
 * the bar, so the color never carries the meaning alone.
 */
export function ProgressMeter({ label, percent, valueText, headline, tone = 'brand', footnote }: ProgressMeterProps) {
  const id = useId();
  const width = Math.min(Math.max(percent ?? 0, 0), 100);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-neutral-700">{label}</span>
        {headline && <span className="text-2xl font-semibold text-neutral-900">{headline}</span>}
      </div>
      <svg role="img" aria-labelledby={`${id}-title ${id}-desc`} viewBox="0 0 100 10" preserveAspectRatio="none"
        className="h-3 w-full overflow-hidden rounded-full">
        <title id={`${id}-title`}>{label}</title>
        <desc id={`${id}-desc`}>{valueText}</desc>
        <rect x={0} y={0} width={100} height={10} className="fill-neutral-200" />
        <rect x={0} y={0} width={width} height={10} className={cn(FILL[tone], 'transition-[width] duration-700')} />
      </svg>
      <p className="text-sm text-neutral-700">{valueText}</p>
      {footnote}
    </div>
  );
}
