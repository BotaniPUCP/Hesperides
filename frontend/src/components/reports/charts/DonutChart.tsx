'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { formatCount } from '../reportFormat';
import { CHART_TEXTS } from '../reportTexts';
import { STROKE, SWATCH, type ChartTone } from './chartTones';

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  tone: ChartTone;
}

export interface DonutChartProps {
  title: string;
  segments: DonutSegment[];
  /** What the total counts, under the number in the middle («labores», «lugares»). */
  totalLabel: string;
  caption?: string;
}

const SIZE = 120;
const RADIUS = 46;
const WIDTH = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** The 2 px surface gap between segments, in viewBox units. */
const GAP = 1.6;

function share(value: number, total: number): string {
  return total === 0 ? '0 %' : `${Math.round((value / total) * 100)} %`;
}

/**
 * Part-to-whole at a glance (≤ 4 segments): the leader's «torta». The total sits
 * in the middle; hovering or focusing a segment or its legend row puts that
 * segment there instead. Every value is also in the legend, as text, and in a
 * hidden table, so the color is never the only way to read it.
 */
export function DonutChart({ title, segments, totalLabel, caption }: DonutChartProps) {
  const id = useId();
  const [active, setActive] = useState<string | null>(null);
  const visible = segments.filter((segment) => segment.value > 0);
  const total = visible.reduce((sum, segment) => sum + segment.value, 0);
  const focused = visible.find((segment) => segment.key === active) ?? null;
  const description = segments.map((s) => `${s.label}: ${formatCount(s.value)} (${share(s.value, total)})`).join('. ');

  const lengths = visible.map((segment) => (segment.value / total) * CIRCUMFERENCE);
  const arcs = visible.map((segment, index) => ({
    segment,
    dash: Math.max(lengths[index] - (visible.length > 1 ? GAP : 0), 0.5),
    offset: lengths.slice(0, index).reduce((sum, length) => sum + length, 0),
  }));

  return (
    <figure className="flex h-full flex-col gap-4">
      <figcaption>
        <span className="block text-lg font-semibold text-neutral-900">{title}</span>
        {caption && <span className="block text-sm text-neutral-700">{caption}</span>}
      </figcaption>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <div className="relative aspect-square w-40 shrink-0">
          <svg role="img" aria-labelledby={`${id}-title ${id}-desc`} viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full -rotate-90">
            <title id={`${id}-title`}>{title}</title>
            <desc id={`${id}-desc`}>{total === 0 ? CHART_TEXTS.noData : description}</desc>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={WIDTH} className="stroke-neutral-100" />
            {arcs.map(({ segment, dash, offset: start }) => (
              <circle key={segment.key} cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={WIDTH}
                strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`} strokeDashoffset={-start}
                className={cn(STROKE[segment.tone], 'cursor-pointer transition-opacity',
                  active !== null && active !== segment.key && 'opacity-35')}
                onMouseEnter={() => setActive(segment.key)} onMouseLeave={() => setActive(null)} />
            ))}
          </svg>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-semibold text-neutral-900">{formatCount(focused ? focused.value : total)}</span>
            <span className="max-w-24 text-xs leading-tight text-neutral-700">
              {focused ? `${focused.label} · ${share(focused.value, total)}` : totalLabel}
            </span>
          </div>
        </div>
        <ul aria-hidden="true" className="w-full min-w-0 space-y-1.5 text-sm">
          {segments.map((segment) => (
            <li key={segment.key} tabIndex={segment.value > 0 ? 0 : -1}
              onMouseEnter={() => setActive(segment.key)} onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(segment.key)} onBlur={() => setActive(null)}
              className={cn('flex items-center gap-2 rounded-md px-2 py-1 outline-hidden transition-colors',
                'focus-visible:ring-2 focus-visible:ring-brand-600',
                active === segment.key ? 'bg-neutral-100' : 'hover:bg-neutral-50')}>
              <span className={cn('h-3 w-3 shrink-0 rounded-xs', SWATCH[segment.tone])} />
              <span className="min-w-0 flex-1 truncate text-neutral-800">{segment.label}</span>
              <span className="font-semibold text-neutral-900">{formatCount(segment.value)}</span>
              <span className="w-11 text-right text-neutral-600">{share(segment.value, total)}</span>
            </li>
          ))}
        </ul>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead><tr><th scope="col">{CHART_TEXTS.categoryColumn}</th><th scope="col">{CHART_TEXTS.valueColumn}</th></tr></thead>
        <tbody>
          {segments.map((s) => <tr key={s.key}><th scope="row">{s.label}</th><td>{formatCount(s.value)}</td></tr>)}
        </tbody>
      </table>
    </figure>
  );
}
