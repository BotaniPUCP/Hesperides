import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { formatPercent } from '../reportFormat';
import { CHART_TEXTS } from '../reportTexts';
import { STROKE, type ChartTone } from './chartTones';

export interface RingGaugeProps {
  title: string;
  /** The real figure, 0 to 100; null is «Sin datos». */
  percent: number | null;
  /** The target in the same unit; drawn as a tick when it is below 100. */
  target?: number | null;
  caption?: ReactNode;
  tone?: ChartTone;
}

const SIZE = 120;
const RADIUS = 50;
const WIDTH = 12;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Where on the ring a percent falls, starting at twelve o'clock and turning clockwise. */
function point(percent: number, radius: number) {
  const angle = (percent / 100) * 2 * Math.PI - Math.PI / 2;
  return { x: SIZE / 2 + radius * Math.cos(angle), y: SIZE / 2 + radius * Math.sin(angle) };
}

/**
 * One headline percent with its target: a hero number wrapped in its progress.
 * The number is written in the middle, so the ring only adds the shape.
 */
export function RingGauge({ title, percent, target = null, caption, tone = 'brand' }: RingGaugeProps) {
  const id = useId();
  const value = percent === null ? 0 : Math.min(Math.max(percent, 0), 100);
  const dash = (value / 100) * CIRCUMFERENCE;
  const text = formatPercent(percent) ?? CHART_TEXTS.noData;
  const targetText = target === null ? '' : `; ${CHART_TEXTS.target(formatPercent(target) ?? '')}`;
  const tick = target !== null && target > 0 && target < 100
    ? { inner: point(target, RADIUS - WIDTH / 2 - 3), outer: point(target, RADIUS + WIDTH / 2 + 3) } : null;

  return (
    <figure className="flex flex-col items-center gap-2 text-center">
      <div className="relative aspect-square w-36">
        <svg role="img" aria-labelledby={`${id}-title ${id}-desc`} viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full">
          <title id={`${id}-title`}>{title}</title>
          <desc id={`${id}-desc`}>{`${text}${targetText}`}</desc>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={WIDTH} className="stroke-neutral-200" />
          {percent !== null && value > 0 && (
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={WIDTH} strokeLinecap="round"
              strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`} transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              className={cn(STROKE[tone], 'transition-[stroke-dasharray] duration-700')} />
          )}
          {tick && (
            <line x1={tick.inner.x} y1={tick.inner.y} x2={tick.outer.x} y2={tick.outer.y} strokeWidth={2}
              className="stroke-neutral-700" />
          )}
        </svg>
        <div aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold text-neutral-900">{text}</span>
          {target !== null && <span className="text-xs text-neutral-700">{CHART_TEXTS.target(formatPercent(target) ?? '')}</span>}
        </div>
      </div>
      <figcaption className="space-y-1">
        <span className="block text-sm font-semibold text-neutral-900">{title}</span>
        {caption && <span className="block text-xs text-neutral-700">{caption}</span>}
      </figcaption>
    </figure>
  );
}
